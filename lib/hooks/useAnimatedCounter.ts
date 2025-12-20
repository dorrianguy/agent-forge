/**
 * useAnimatedCounter - Animated number counter hook
 *
 * Usage:
 * const displayValue = useAnimatedCounter(1234, 1000);
 * <span>{displayValue}</span>
 */

import { useState, useEffect } from 'react';

/**
 * Hook that animates a number from 0 to target value
 * @param target - The target number to animate to
 * @param duration - Animation duration in milliseconds (default: 1000)
 * @param startValue - Starting value (default: 0)
 * @returns The current animated value
 */
export function useAnimatedCounter(
  target: number,
  duration: number = 1000,
  startValue: number = 0
): number {
  const [value, setValue] = useState(startValue);

  useEffect(() => {
    if (target === startValue) {
      setValue(startValue);
      return;
    }

    const startTime = Date.now();
    const diff = target - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(startValue + diff * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, startValue]);

  return value;
}

/**
 * Hook for counting with formatting (e.g., 1,234 or 1.2K)
 * @param target - The target number
 * @param duration - Animation duration
 * @param format - 'comma' for 1,234 or 'compact' for 1.2K
 */
export function useFormattedCounter(
  target: number,
  duration: number = 1000,
  format: 'comma' | 'compact' = 'comma'
): string {
  const value = useAnimatedCounter(target, duration);

  if (format === 'compact') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  return value.toLocaleString();
}

/**
 * Hook for percentage counter (0-100)
 */
export function usePercentageCounter(
  target: number,
  duration: number = 1000
): string {
  const value = useAnimatedCounter(Math.min(target, 100), duration);
  return `${value}%`;
}

export default useAnimatedCounter;
