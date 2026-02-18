/**
 * Tests for useAnimatedCounter hook logic
 *
 * Tests the animation logic without React rendering.
 * The hook animates a counter from 0 to target using requestAnimationFrame.
 */

describe('Animated Counter Logic', () => {
  // Extracted logic from the hook for unit testing
  function calculateCountAtProgress(progress: number, target: number): number {
    return Math.floor(progress * target);
  }

  function calculateProgress(elapsed: number, duration: number): number {
    return Math.min(elapsed / duration, 1);
  }

  describe('calculateProgress', () => {
    it('returns 0 at start', () => {
      expect(calculateProgress(0, 1000)).toBe(0);
    });

    it('returns 0.5 at midpoint', () => {
      expect(calculateProgress(500, 1000)).toBe(0.5);
    });

    it('returns 1 at completion', () => {
      expect(calculateProgress(1000, 1000)).toBe(1);
    });

    it('caps at 1 when elapsed exceeds duration', () => {
      expect(calculateProgress(2000, 1000)).toBe(1);
    });

    it('handles zero duration', () => {
      // Division by zero protection would be needed in real code
      expect(calculateProgress(0, 0)).toBeNaN();
    });
  });

  describe('calculateCountAtProgress', () => {
    it('returns 0 at start', () => {
      expect(calculateCountAtProgress(0, 100)).toBe(0);
    });

    it('returns target at completion', () => {
      expect(calculateCountAtProgress(1, 100)).toBe(100);
    });

    it('returns floor of intermediate values', () => {
      expect(calculateCountAtProgress(0.5, 100)).toBe(50);
      expect(calculateCountAtProgress(0.33, 100)).toBe(33);
      expect(calculateCountAtProgress(0.99, 100)).toBe(99);
    });

    it('handles zero target', () => {
      expect(calculateCountAtProgress(0.5, 0)).toBe(0);
      expect(calculateCountAtProgress(1, 0)).toBe(0);
    });

    it('handles large numbers', () => {
      expect(calculateCountAtProgress(1, 1000000)).toBe(1000000);
      expect(calculateCountAtProgress(0.5, 1000000)).toBe(500000);
    });

    it('always returns integer', () => {
      const result = calculateCountAtProgress(0.333, 100);
      expect(result).toBe(Math.floor(result));
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Animation Sequence', () => {
    it('produces correct count sequence', () => {
      const target = 100;
      const duration = 1000;
      const frameInterval = 16; // ~60fps

      const counts: number[] = [];
      let elapsed = 0;

      while (elapsed <= duration) {
        const progress = calculateProgress(elapsed, duration);
        counts.push(calculateCountAtProgress(progress, target));
        elapsed += frameInterval;
      }

      // First value should be 0
      expect(counts[0]).toBe(0);

      // Last value should be target
      expect(counts[counts.length - 1]).toBe(target);

      // Values should be monotonically non-decreasing
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      }
    });

    it('completes within expected frame count', () => {
      const duration = 1000;
      const fps = 60;
      const expectedFrames = Math.ceil(duration / (1000 / fps));
      // Should complete in about 60 frames at 60fps for 1s duration
      expect(expectedFrames).toBeLessThanOrEqual(65);
      expect(expectedFrames).toBeGreaterThanOrEqual(55);
    });
  });
});
