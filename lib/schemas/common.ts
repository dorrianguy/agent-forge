/**
 * Common / shared Zod schemas used across Agent Forge.
 *
 * Includes pagination, UUID, sanitization helpers, and generic re-usable schemas.
 */

import { z } from 'zod';

// ============================================================
// String patterns
// ============================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const UUIDSchema = z.string().regex(UUID_REGEX, 'Must be a valid UUID');

export const EmailSchema = z
  .string()
  .max(320)
  .regex(EMAIL_REGEX, 'Must be a valid email address');

export const SlugSchema = z
  .string()
  .max(128)
  .regex(SLUG_REGEX, 'Must be a valid slug (lowercase, hyphens only)');

// ============================================================
// Sanitization
// ============================================================

/** Strips HTML tags and stray angle brackets, then trims. */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

/** Recursively sanitize all string values in a plain object. */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      (result as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
      );
    }
  }
  return result;
}

/**
 * Zod transform that sanitizes a string value.
 * Usage: z.string().transform(sanitizeTransform)
 */
export const sanitizeTransform = (val: string): string => sanitizeString(val);

// ============================================================
// Pagination
// ============================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Build a pagination schema that restricts sortBy to a known allowlist.
 */
export function paginationWithSort(
  allowedSortFields: readonly string[],
): z.ZodType<PaginationInput> {
  return PaginationSchema.extend({
    sortBy: z
      .string()
      .refine(
        (v) => !v || allowedSortFields.includes(v),
        `Must be one of: ${allowedSortFields.join(', ')}`,
      )
      .optional(),
  }) as unknown as z.ZodType<PaginationInput>;
}

// ============================================================
// Billing
// ============================================================

export const VALID_PLANS = ['starter', 'pro', 'scale', 'enterprise'] as const;
export type PlanType = (typeof VALID_PLANS)[number];

export const PlanSchema = z.enum(VALID_PLANS);

export const PLAN_AGENT_LIMITS: Record<string, number> = {
  starter: 3,
  pro: 15,
  scale: Infinity,
  enterprise: Infinity,
  professional: 5, // Legacy plan
  free: 0,
};
