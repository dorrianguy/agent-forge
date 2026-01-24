/**
 * Production-grade rate limiter
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured
 * Falls back to in-memory with bounded size for development/single-instance
 */

import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Bounded LRU-like in-memory store (max 10,000 entries to prevent memory growth)
const MAX_ENTRIES = 10000;
const rateLimitStore = new Map<string, RateLimitEntry>();

// Upstash Redis client type (use flexible type, cast at call site)
type UpstashRedisClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
};

let redisClient: UpstashRedisClient | null = null;
let redisInitialized = false;

async function getRedisClient(): Promise<UpstashRedisClient | null> {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis');
      redisClient = new Redis({ url: redisUrl, token: redisToken }) as UpstashRedisClient;
      logger.info('Rate limiter using Upstash Redis');
    } catch {
      logger.warn('Upstash Redis not available, using in-memory rate limiter');
    }
  }

  return redisClient;
}

// Clean up expired entries and enforce max size
function cleanupInMemoryStore() {
  const now = Date.now();

  // Use Array.from to avoid downlevelIteration issues
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }

  if (rateLimitStore.size > MAX_ENTRIES) {
    const sortedEntries = Array.from(rateLimitStore.entries());
    sortedEntries.sort((a, b) => a[1].resetTime - b[1].resetTime);
    const toRemove = sortedEntries.slice(0, sortedEntries.length - MAX_ENTRIES);
    for (const [key] of toRemove) {
      rateLimitStore.delete(key);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupInMemoryStore, 60000);
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

async function checkRateLimitRedis(
  identifier: string,
  config: RateLimitConfig,
  redis: NonNullable<typeof redisClient>
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  const now = Date.now();
  const resetTime = now + config.windowMs;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    return {
      success: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime,
      limit: config.maxRequests,
    };
  } catch (error) {
    logger.error('Redis rate limit error, falling back to in-memory', error);
    return checkRateLimitInMemory(identifier, config);
  }
}

function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    if (rateLimitStore.size >= MAX_ENTRIES - 100) {
      cleanupInMemoryStore();
    }

    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Synchronous rate limit check (in-memory only)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimitInMemory(identifier, config);
}

/**
 * Async rate limit check - uses Redis when available
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = await getRedisClient();
  if (redis) {
    return checkRateLimitRedis(identifier, config, redis);
  }
  return checkRateLimitInMemory(identifier, config);
}

/**
 * Generate standard rate limit headers
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  if (!result.success) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString();
  }
  return headers;
}
