// =============================================================================
// Rate Limiter — Token Bucket Algorithm
// =============================================================================
//
// In-memory rate limiter using the token bucket algorithm.
// Works in both serverless (Vercel) and self-hosted (Node) environments.
//
// NOTE: In serverless environments, rate limits are per-instance and will
// reset on cold starts. For production serverless, use Redis-backed limiting
// (e.g., @upstash/ratelimit). This provides baseline protection regardless.
// =============================================================================

import type { RateLimitConfig, RateLimitResult } from './types';

// ---------------------------------------------------------------------------
// Default Configurations
// ---------------------------------------------------------------------------

/** Default rate limit for general API routes: 60 req/min */
export const API_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

/** Default rate limit for LLM generation: 10 req/min */
export const GENERATION_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

/** Default rate limit for validation: 30 req/min */
export const VALIDATION_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 30,
};

// ---------------------------------------------------------------------------
// Token Bucket Implementation
// ---------------------------------------------------------------------------

interface TokenBucket {
  /** Current number of tokens available */
  tokens: number;
  /** Timestamp of last refill */
  lastRefill: number;
}

/**
 * In-memory rate limiter using the token bucket algorithm.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });
 * const result = limiter.check('user-ip-123');
 * if (!result.allowed) {
 *   res.status(429).json({ error: 'Rate limit exceeded' });
 * }
 * ```
 */
export class RateLimiter {
  private readonly buckets: Map<string, TokenBucket> = new Map();
  private readonly config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Periodically clean up expired buckets to prevent memory leaks
    // Only in Node.js environments (not edge runtime)
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, config.windowMs * 2);

      // Allow the process to exit even if the interval is running
      if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Check if a request from the given key is allowed.
   *
   * @param key - Unique identifier (IP address, user ID, etc.)
   * @returns Rate limit result with allowed flag and metadata
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      // First request from this key — create bucket with (max - 1) tokens
      this.buckets.set(key, {
        tokens: this.config.maxRequests - 1,
        lastRefill: now,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetMs: this.config.windowMs,
        limit: this.config.maxRequests,
      };
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const refillRate = this.config.maxRequests / this.config.windowMs;
    const tokensToAdd = elapsed * refillRate;
    bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      // Rate limited
      const resetMs = Math.ceil((1 - bucket.tokens) / refillRate);

      return {
        allowed: false,
        remaining: 0,
        resetMs,
        limit: this.config.maxRequests,
      };
    }

    // Consume a token
    bucket.tokens -= 1;

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetMs: this.config.windowMs,
      limit: this.config.maxRequests,
    };
  }

  /**
   * Consume a token without checking (use after check() returns allowed).
   * Useful when you want to separate checking from consuming.
   *
   * @param key - Unique identifier
   */
  consume(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.tokens >= 1) {
      bucket.tokens -= 1;
    }
  }

  /**
   * Reset the rate limit for a specific key.
   *
   * @param key - Unique identifier to reset
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clean up expired buckets to prevent memory leaks.
   * Removes buckets that have been fully refilled and idle.
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, bucket] of this.buckets.entries()) {
      const elapsed = now - bucket.lastRefill;
      if (elapsed > this.config.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval. Call this when shutting down.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Instances (for use across API routes)
// ---------------------------------------------------------------------------

/** Global rate limiter for general API routes */
let apiLimiterInstance: RateLimiter | null = null;

/** Global rate limiter for generation endpoints */
let generationLimiterInstance: RateLimiter | null = null;

/** Global rate limiter for validation endpoints */
let validationLimiterInstance: RateLimiter | null = null;

/**
 * Get the singleton API rate limiter instance.
 *
 * @returns RateLimiter configured for general API routes
 */
export function getApiLimiter(): RateLimiter {
  if (!apiLimiterInstance) {
    apiLimiterInstance = new RateLimiter(API_RATE_LIMIT);
  }
  return apiLimiterInstance;
}

/**
 * Get the singleton generation rate limiter instance.
 *
 * @returns RateLimiter configured for LLM generation endpoints
 */
export function getGenerationLimiter(): RateLimiter {
  if (!generationLimiterInstance) {
    generationLimiterInstance = new RateLimiter(GENERATION_RATE_LIMIT);
  }
  return generationLimiterInstance;
}

/**
 * Get the singleton validation rate limiter instance.
 *
 * @returns RateLimiter configured for validation endpoints
 */
export function getValidationLimiter(): RateLimiter {
  if (!validationLimiterInstance) {
    validationLimiterInstance = new RateLimiter(VALIDATION_RATE_LIMIT);
  }
  return validationLimiterInstance;
}

// ---------------------------------------------------------------------------
// Utility: Extract Client IP
// ---------------------------------------------------------------------------

/**
 * Extract the client IP from a Next.js API request.
 * Handles common proxy headers (X-Forwarded-For, X-Real-IP).
 *
 * @param headers - Request headers object
 * @returns Client IP address string
 */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  // X-Forwarded-For can contain multiple IPs; first is the client
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    if (ip) return ip.trim();
  }

  const realIP = headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? (realIP[0] || 'unknown') : realIP;
  }

  return 'unknown';
}
