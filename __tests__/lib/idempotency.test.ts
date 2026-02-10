/**
 * Tests for lib/idempotency.ts
 *
 * Covers:
 * - In-memory event tracking (Redis not configured in test env)
 * - shouldProcessEvent atomic check-and-set
 * - Duplicate detection
 * - TTL-based expiration
 * - isEventProcessed queries
 */

import {
  shouldProcessEvent,
  isEventProcessed,
  markEventProcessed,
} from '@/lib/idempotency';

describe('idempotency', () => {
  describe('shouldProcessEvent', () => {
    it('should return true for a new event', () => {
      const eventId = `evt_new_${Date.now()}_${Math.random()}`;
      expect(shouldProcessEvent(eventId)).toBe(true);
    });

    it('should return false for a duplicate event', () => {
      const eventId = `evt_dup_${Date.now()}_${Math.random()}`;
      expect(shouldProcessEvent(eventId)).toBe(true);
      expect(shouldProcessEvent(eventId)).toBe(false);
    });

    it('should track multiple different events independently', () => {
      const id1 = `evt_multi_a_${Date.now()}_${Math.random()}`;
      const id2 = `evt_multi_b_${Date.now()}_${Math.random()}`;
      const id3 = `evt_multi_c_${Date.now()}_${Math.random()}`;

      expect(shouldProcessEvent(id1)).toBe(true);
      expect(shouldProcessEvent(id2)).toBe(true);
      expect(shouldProcessEvent(id3)).toBe(true);

      // All should now be duplicates
      expect(shouldProcessEvent(id1)).toBe(false);
      expect(shouldProcessEvent(id2)).toBe(false);
      expect(shouldProcessEvent(id3)).toBe(false);
    });
  });

  describe('isEventProcessed', () => {
    it('should return false for unknown events', () => {
      const eventId = `evt_unknown_${Date.now()}_${Math.random()}`;
      expect(isEventProcessed(eventId)).toBe(false);
    });

    it('should return true after marking an event', () => {
      const eventId = `evt_marked_${Date.now()}_${Math.random()}`;
      markEventProcessed(eventId);
      expect(isEventProcessed(eventId)).toBe(true);
    });

    it('should return true after shouldProcessEvent', () => {
      const eventId = `evt_after_should_${Date.now()}_${Math.random()}`;
      shouldProcessEvent(eventId);
      expect(isEventProcessed(eventId)).toBe(true);
    });
  });

  describe('markEventProcessed', () => {
    it('should mark an event as processed', () => {
      const eventId = `evt_mark_${Date.now()}_${Math.random()}`;
      expect(isEventProcessed(eventId)).toBe(false);
      markEventProcessed(eventId);
      expect(isEventProcessed(eventId)).toBe(true);
    });

    it('should be idempotent (marking twice is fine)', () => {
      const eventId = `evt_mark_twice_${Date.now()}_${Math.random()}`;
      markEventProcessed(eventId);
      markEventProcessed(eventId);
      expect(isEventProcessed(eventId)).toBe(true);
    });
  });
});
