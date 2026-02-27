// =============================================================================
// Input Validation — Zod Schemas & Sanitization
// =============================================================================
//
// Provides Zod schemas for all API inputs, request validation utilities,
// and string sanitization to prevent XSS and injection attacks.
//
// Ported from Vigil's middleware/validate.ts to Next.js architecture.
// =============================================================================

import { z, ZodSchema, ZodError } from 'zod';
import type { ValidationError, ValidationErrorResponse } from './types';

// ---------------------------------------------------------------------------
// String Sanitization
// ---------------------------------------------------------------------------

/** HTML entity map for escaping dangerous characters */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

/** Regex matching characters that need HTML-escaping */
const HTML_ESCAPE_RE = /[&<>"'`/]/g;

/**
 * Strip HTML tags and escape dangerous characters to prevent XSS.
 * Does NOT throw — always returns a safe string.
 *
 * @param input - Raw string input from user
 * @returns Sanitized string with HTML stripped and entities escaped
 */
export function sanitizeString(input: string): string {
  // Strip all HTML tags
  let cleaned = input.replace(/<[^>]*>/g, '');

  // Escape remaining dangerous characters
  cleaned = cleaned.replace(HTML_ESCAPE_RE, (char) => HTML_ENTITIES[char] || char);

  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, '');

  return cleaned.trim();
}

/**
 * Create a Zod string schema with sanitization and max-length built in.
 *
 * @param maxLength - Maximum allowed string length (default: 1000)
 * @returns Zod string schema that sanitizes input
 */
export function safeString(maxLength = 1000): z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString> {
  return z
    .string()
    .transform(sanitizeString)
    .pipe(z.string().max(maxLength));
}

/**
 * Create an optional Zod string schema with sanitization.
 *
 * @param maxLength - Maximum allowed string length (default: 1000)
 * @returns Optional Zod string schema that sanitizes input
 */
export function optionalSafeString(maxLength = 1000): z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>> {
  return safeString(maxLength).optional();
}

// ---------------------------------------------------------------------------
// Zod Schemas — LaunchBrief
// ---------------------------------------------------------------------------

/** Schema for a product feature */
export const FeatureSchema = z.object({
  name: safeString(200),
  description: safeString(2000),
  benefit: safeString(1000),
});

/** Schema for a testimonial quote */
export const QuoteSchema = z.object({
  text: safeString(2000),
  author: safeString(200),
  title: optionalSafeString(200),
  company: optionalSafeString(200),
});

/** Valid brand voice options */
export const BrandVoiceSchema = z.enum([
  'professional',
  'casual',
  'bold',
  'technical',
]);

/** Valid social platform options */
export const SocialPlatformSchema = z.enum([
  'twitter',
  'linkedin',
  'producthunt',
  'hackernews',
  'instagram',
]);

/** Full LaunchBrief validation schema */
export const LaunchBriefSchema = z.object({
  id: safeString(100),

  // Core
  productName: safeString(200),
  tagline: safeString(500),
  valueProposition: safeString(5000),
  keyFeatures: z.array(FeatureSchema).min(1).max(20),
  targetAudience: safeString(2000),

  // Pricing & Availability
  pricing: safeString(1000),
  launchDate: safeString(50),
  availabilityNote: optionalSafeString(1000),

  // Links
  landingPageUrl: z.string().url().max(2000),
  signupUrl: z.string().url().max(2000).optional(),
  demoUrl: z.string().url().max(2000).optional(),

  // Social proof
  quotes: z.array(QuoteSchema).max(20).optional(),
  stats: z.array(safeString(500)).max(20).optional(),

  // Brand
  companyName: safeString(200),
  founderName: optionalSafeString(200),
  founderTitle: optionalSafeString(200),
  brandVoice: BrandVoiceSchema,

  // Distribution
  socialPlatforms: z.array(SocialPlatformSchema).min(1).max(5),
  emailListSize: z.number().int().min(0).max(100_000_000).optional(),
});

/** Schema for the LLM provider option */
export const LLMProviderSchema = z.enum(['openai', 'anthropic']);

// ---------------------------------------------------------------------------
// Zod Schemas — API Request Bodies
// ---------------------------------------------------------------------------

/** Schema for POST /api/launch/generate */
export const GenerateRequestSchema = z.object({
  brief: LaunchBriefSchema,
  provider: LLMProviderSchema.optional(),
  model: safeString(100).optional(),
  stream: z.boolean().optional(),
});

/** Schema for POST /api/launch/validate */
export const ValidateRequestSchema = z.object({
  brief: LaunchBriefSchema,
  assets: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Request Validation Utility
// ---------------------------------------------------------------------------

/**
 * Validate a request body against a Zod schema.
 * Returns the parsed (and sanitized) data on success, or a structured error.
 *
 * @param schema - Zod schema to validate against
 * @param body - Raw request body to validate
 * @returns Object with `success`, `data`, and optional `error` fields
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false; error: ValidationErrorResponse } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      const details: ValidationError[] = err.issues.map((issue) => ({
        field: issue.path.join('.') || '_root',
        message: issue.message,
      }));

      return {
        success: false,
        error: {
          error: 'validation_error',
          details,
        },
      };
    }

    // Unexpected error — return generic validation error
    return {
      success: false,
      error: {
        error: 'validation_error',
        details: [{ field: '_root', message: 'Invalid request body' }],
      },
    };
  }
}
