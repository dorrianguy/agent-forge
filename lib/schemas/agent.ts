/**
 * Zod schemas for Agent create / update operations.
 *
 * These replace the hand-rolled validators in lib/validation.ts while
 * keeping identical runtime behaviour and the same exported type shapes.
 */

import { z } from 'zod';
import { sanitizeTransform } from './common';

// ============================================================
// Agent enums
// ============================================================

export const VALID_AGENT_TYPES = [
  'customer_support',
  'sales',
  'lead_qualifier',
  'booking',
  'faq',
  'voice',
  'email',
  'custom',
] as const;

export type AgentType = (typeof VALID_AGENT_TYPES)[number];
export const AgentTypeSchema = z.enum(VALID_AGENT_TYPES);

export const VALID_AGENT_STATUSES = ['ready', 'live', 'paused'] as const;
export type AgentStatus = (typeof VALID_AGENT_STATUSES)[number];
export const AgentStatusSchema = z.enum(VALID_AGENT_STATUSES);

// ============================================================
// Model escalation config (stored in agent config)
// ============================================================

export const EscalationLevelSchema = z.enum([
  'off',
  'conservative',
  'balanced',
  'aggressive',
]);
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;

export const ModelEscalationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  level: EscalationLevelSchema.default('balanced'),
  models: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .optional(),
});

export type ModelEscalationConfig = z.infer<typeof ModelEscalationConfigSchema>;

// ============================================================
// Agent config schema (JSONB stored in Supabase)
// ============================================================

export const AgentConfigSchema = z
  .object({
    systemPrompt: z.string().optional(),
    personality: z.string().optional(),
    instructions: z.string().optional(),
    responseFormat: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128000).optional(),
    tools: z.array(z.record(z.unknown())).optional(),
    knowledgeBase: z
      .array(
        z.object({
          title: z.string(),
          content: z.string(),
        }),
      )
      .optional(),
    toolExamples: z.record(z.array(z.record(z.unknown()))).optional(),
    escalation: ModelEscalationConfigSchema.optional(),
  })
  .passthrough(); // allow additional provider-specific keys

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// ============================================================
// Create Agent
// ============================================================

export const CreateAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be 100 characters or less')
    .transform(sanitizeTransform)
    .refine((v) => v.length > 0, 'Agent name cannot be empty after sanitization'),
  type: AgentTypeSchema,
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .transform(sanitizeTransform)
    .optional()
    .nullable(),
  config: AgentConfigSchema.optional().nullable(),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;

// ============================================================
// Update Agent
// ============================================================

export const UpdateAgentSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name must be 100 characters or less')
      .transform(sanitizeTransform)
      .refine((v) => v.length > 0, 'Name cannot be empty after sanitization')
      .optional(),
    type: AgentTypeSchema.optional(),
    description: z
      .string()
      .max(500, 'Description must be 500 characters or less')
      .transform(sanitizeTransform)
      .optional()
      .nullable(),
    status: AgentStatusSchema.optional(),
    config: AgentConfigSchema.optional().nullable(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.type !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.config !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
