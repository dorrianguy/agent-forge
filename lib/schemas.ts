/**
 * Agent Forge - Zod Schemas
 *
 * Single source of truth for all validation.
 * These schemas serve triple duty:
 *   1. Runtime request validation (replaces custom validators)
 *   2. TypeScript type inference (replaces manual interfaces)
 *   3. LLM tool input schemas (JSON Schema export for Claude/OpenAI)
 */

import { z } from 'zod';

// ============================================================
// PRIMITIVES
// ============================================================

const sanitize = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();

const SafeString = z.string().transform(sanitize);

// ============================================================
// AGENT SCHEMAS
// ============================================================

export const AGENT_TYPES = [
  'customer_support',
  'sales',
  'lead_qualifier',
  'booking',
  'faq',
  'voice',
  'email',
  'custom',
] as const;

export const AGENT_STATUSES = ['ready', 'live', 'paused'] as const;

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitize),
  type: z.enum(AGENT_TYPES),
  description: z.string().max(500).transform(sanitize).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateAgentSchema = z
  .object({
    name: z.string().min(1).max(100).transform(sanitize).optional(),
    type: z.enum(AGENT_TYPES).optional(),
    description: z.string().max(500).transform(sanitize).optional(),
    status: z.enum(AGENT_STATUSES).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .check(
    (ctx) => {
      const d = ctx.value;
      if (!Object.values(d).some((v) => v !== undefined)) {
        ctx.issues.push({
          code: 'custom',
          message: 'At least one field must be provided for update',
          input: d,
          path: [],
        });
      }
    },
  );

// ============================================================
// AGENT GENERATION (structured output from LLM)
// ============================================================

export const AgentPersonalitySchema = z.object({
  tone: z.enum(['professional', 'friendly', 'casual', 'formal']),
  style: z.enum(['concise', 'detailed', 'conversational']),
  traits: z.array(z.string()).min(1).max(5),
});

export const WidgetConfigSchema = z.object({
  position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#f97316'),
  chatTitle: z.string().max(60),
});

export const GeneratedAgentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['support', 'sales', 'lead', 'custom']),
  personality: AgentPersonalitySchema,
  systemPrompt: z.string().min(20).max(4000),
  greeting: z.string().min(5).max(500),
  fallbackMessage: z.string().min(5).max(500),
  escalationTriggers: z.array(z.string()).max(10),
  knowledgeTopics: z.array(z.string()).max(10),
  suggestedQuestions: z.array(z.string()).min(1).max(5),
  widgetConfig: WidgetConfigSchema,
});

// ============================================================
// TTS SCHEMA
// ============================================================

const VALID_VOICES = [
  'alloy',
  'echo',
  'fable',
  'nova',
  'onyx',
  'shimmer',
  'rachel',
  'adam',
  'bella',
] as const;

export const TTSSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.enum(VALID_VOICES).optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
});

/**
 * TTS with auth-aware text limit.
 * Anonymous users: 500 chars. Authenticated: 4096.
 */
export const ttsSchemaForAuth = (isAuthenticated: boolean) =>
  TTSSchema.extend({
    text: z.string().min(1).max(isAuthenticated ? 4096 : 500),
  });

// ============================================================
// PAGINATION
// ============================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const paginationWithAllowedSorts = (allowed: string[]) =>
  PaginationSchema.extend({
    sort: z.enum(allowed as [string, ...string[]]).optional(),
  });

// ============================================================
// BILLING
// ============================================================

export const VALID_PLANS = ['starter', 'pro', 'scale', 'enterprise'] as const;
export const PlanSchema = z.enum(VALID_PLANS);

// ============================================================
// ID VALIDATION
// ============================================================

export const UUIDSchema = z
  .string()
  .uuid('ID must be a valid UUID');

// ============================================================
// TYPE EXPORTS (inferred from schemas)
// ============================================================

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type GeneratedAgentConfig = z.infer<typeof GeneratedAgentConfigSchema>;
export type TTSInput = z.infer<typeof TTSSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

// ============================================================
// HELPERS
// ============================================================

/**
 * Convert a Zod schema to JSON Schema for LLM tool definitions.
 * Uses Zod v4's built-in toJSONSchema.
 */
export function zodToToolSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}

/**
 * Format Zod errors into the API error format matching the old ValidationError shape.
 */
export function formatZodErrors(error: z.ZodError): {
  error: string;
  details: Array<{ field: string; message: string; code: string }>;
} {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
    code: issue.code,
  }));

  return {
    error: details[0]?.message || 'Validation failed',
    details,
  };
}
