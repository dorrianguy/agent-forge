/**
 * Production-grade idempotency tracking for webhook events
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured
 * Falls back to bounded in-memory storage for development/single-instance
 */

import { logger } from './logger';

interface ProcessedEvent {
  processedAt: number;
}

// Bounded in-memory store (max 50,000 entries)
const MAX_ENTRIES = 50000;
const processedEvents = new Map<string, ProcessedEvent>();

// TTL for processed events (24 hours)
const EVENT_TTL_MS = 24 * 60 * 60 * 1000;
const EVENT_TTL_SECONDS = 24 * 60 * 60;

// Upstash Redis client type (use unknown for flexibility, cast at call site)
type UpstashRedisClient = {
  get: <T = string>(key: string) => Promise<T | null>;
  set: <T = string>(key: string, value: T, opts?: { ex?: number }) => Promise<unknown>;
  setnx: <T = string>(key: string, value: T) => Promise<number>;
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
      logger.info('Idempotency tracker using Upstash Redis');
    } catch {
      logger.warn('Upstash Redis not available, using in-memory idempotency');
    }
  }

  return redisClient;
}

// Clean up expired entries and enforce max size
function cleanupInMemoryStore() {
  const now = Date.now();

  for (const [key, entry] of processedEvents.entries()) {
    if (now - entry.processedAt > EVENT_TTL_MS) {
      processedEvents.delete(key);
    }
  }

  if (processedEvents.size > MAX_ENTRIES) {
    const entries = Array.from(processedEvents.entries());
    entries.sort((a, b) => a[1].processedAt - b[1].processedAt);
    const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
    for (const [key] of toRemove) {
      processedEvents.delete(key);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupInMemoryStore, 60000);
}

/**
 * Check if an event has already been processed (in-memory)
 */
export function isEventProcessed(eventId: string): boolean {
  const entry = processedEvents.get(eventId);
  if (!entry) return false;

  // Check if expired
  if (Date.now() - entry.processedAt > EVENT_TTL_MS) {
    processedEvents.delete(eventId);
    return false;
  }

  return true;
}

/**
 * Mark an event as processed (in-memory)
 */
export function markEventProcessed(eventId: string): void {
  if (processedEvents.size >= MAX_ENTRIES - 100) {
    cleanupInMemoryStore();
  }

  processedEvents.set(eventId, {
    processedAt: Date.now(),
  });
}

/**
 * Combined check and mark for atomic operation (synchronous, in-memory)
 * @returns true if event should be processed (wasn't already processed)
 */
export function shouldProcessEvent(eventId: string): boolean {
  if (isEventProcessed(eventId)) {
    return false;
  }
  markEventProcessed(eventId);
  return true;
}

/**
 * Async version using Redis when available
 * Uses SETNX for atomic check-and-set to prevent race conditions
 * @returns true if event should be processed (wasn't already processed)
 */
export async function shouldProcessEventAsync(eventId: string): Promise<boolean> {
  const redis = await getRedisClient();

  if (redis) {
    const key = `idempotency:${eventId}`;
    try {
      // SETNX returns 1 if key was set (new), 0 if key already existed
      const result = await redis.setnx(key, Date.now().toString());

      if (result === 1) {
        // Key was new, set expiration
        await redis.expire(key, EVENT_TTL_SECONDS);
        return true;
      }

      // Key already existed - duplicate event
      return false;
    } catch (error) {
      logger.error('Redis idempotency error, falling back to in-memory', error);
      return shouldProcessEvent(eventId);
    }
  }

  return shouldProcessEvent(eventId);
}

/**
 * Check if event was processed (async, uses Redis if available)
 */
export async function isEventProcessedAsync(eventId: string): Promise<boolean> {
  const redis = await getRedisClient();

  if (redis) {
    const key = `idempotency:${eventId}`;
    try {
      const result = await redis.get(key);
      return result !== null;
    } catch (error) {
      logger.error('Redis idempotency check error', error);
      return isEventProcessed(eventId);
    }
  }

  return isEventProcessed(eventId);
}
