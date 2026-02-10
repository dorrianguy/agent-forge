/**
 * Tests for lib/rateLimit.ts
 *
 * Covers:
 * - In-memory rate limiting (Redis not configured in test env)
 * - Window-based counting
 * - Limit enforcement
 * - Rate limit header generation
 * - Expiration and cleanup
 */

import { checkRateLimit, getRateLimitHeaders, type RateLimitConfig, type RateLimitResult } from '@/lib/rateLimit';

describe('rateLimit', () => {
  const defaultConfig: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 60_000, // 1 minute
  };

  describe('checkRateLimit (in-memory)', () => {
    it('should allow requests within the limit', () => {
      const id = `test-allow-${Date.now()}-${Math.random()}`;

      const result = checkRateLimit(id, defaultConfig);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(result.limit).toBe(5);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should decrement remaining on successive calls', () => {
      const id = `test-decrement-${Date.now()}-${Math.random()}`;

      const r1 = checkRateLimit(id, defaultConfig);
      const r2 = checkRateLimit(id, defaultConfig);
      const r3 = checkRateLimit(id, defaultConfig);

      expect(r1.remaining).toBe(4);
      expect(r2.remaining).toBe(3);
      expect(r3.remaining).toBe(2);
    });

    it('should reject requests exceeding the limit', () => {
      const id = `test-reject-${Date.now()}-${Math.random()}`;

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        const r = checkRateLimit(id, defaultConfig);
        expect(r.success).toBe(true);
      }

      // Next request should be rejected
      const rejected = checkRateLimit(id, defaultConfig);
      expect(rejected.success).toBe(false);
      expect(rejected.remaining).toBe(0);
    });

    it('should use separate counters for different identifiers', () => {
      const id1 = `test-sep-a-${Date.now()}-${Math.random()}`;
      const id2 = `test-sep-b-${Date.now()}-${Math.random()}`;
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60_000 };

      checkRateLimit(id1, config);
      checkRateLimit(id1, config);
      const rejected1 = checkRateLimit(id1, config);

      const allowed2 = checkRateLimit(id2, config);

      expect(rejected1.success).toBe(false);
      expect(allowed2.success).toBe(true);
      expect(allowed2.remaining).toBe(1);
    });

    it('should reset after the window expires', () => {
      const id = `test-expire-${Date.now()}-${Math.random()}`;
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 50 }; // 50ms window

      const r1 = checkRateLimit(id, config);
      expect(r1.success).toBe(true);

      const r2 = checkRateLimit(id, config);
      expect(r2.success).toBe(false);

      // Wait for window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const r3 = checkRateLimit(id, config);
          expect(r3.success).toBe(true);
          expect(r3.remaining).toBe(0); // 1 - 1
          resolve();
        }, 60);
      });
    });

    it('should handle maxRequests of 1 (strict limiting)', () => {
      const id = `test-strict-${Date.now()}-${Math.random()}`;
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60_000 };

      const r1 = checkRateLimit(id, config);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(0);

      const r2 = checkRateLimit(id, config);
      expect(r2.success).toBe(false);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return standard rate limit headers for successful requests', () => {
      const result: RateLimitResult = {
        success: true,
        remaining: 3,
        resetTime: 1700000000000,
        limit: 5,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('3');
      expect(headers['X-RateLimit-Reset']).toBe('1700000000');
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After header for rejected requests', () => {
      const futureReset = Date.now() + 30_000; // 30 seconds from now
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        resetTime: futureReset,
        limit: 5,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBeDefined();
      const retryAfter = parseInt(headers['Retry-After']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(30);
    });
  });
});
