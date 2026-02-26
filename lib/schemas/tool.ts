/**
 * Zod schemas for tool definitions, tool parameters, and the tool registry config.
 *
 * These schemas serve as the single source of truth for:
 *   1. Runtime validation of tool configs entered by users
 *   2. JSON Schema generation sent to LLMs (via toJsonSchema)
 *   3. Provider-agnostic tool serialization (OpenAI / Anthropic / Google)
 */

import { z } from 'zod';

// ============================================================
// Tool parameter types
// ============================================================

export const TOOL_PARAM_TYPES = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
] as const;

export type ToolParamType = (typeof TOOL_PARAM_TYPES)[number];

export const ToolParameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  type: z.enum(TOOL_PARAM_TYPES),
  description: z.string().min(1, 'Parameter description is required'),
  required: z.boolean().default(true),
  default: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
});

export type ToolParameter = z.infer<typeof ToolParameterSchema>;

// ============================================================
// Tool handler
// ============================================================

export const TOOL_HANDLER_TYPES = [
  'api_call',
  'knowledge_search',
  'set_variable',
  'custom',
] as const;

export type ToolHandlerType = (typeof TOOL_HANDLER_TYPES)[number];

export const ToolHandlerSchema = z.object({
  type: z.enum(TOOL_HANDLER_TYPES),
  config: z.record(z.unknown()),
});

export type ToolHandler = z.infer<typeof ToolHandlerSchema>;

// ============================================================
// Input example (few-shot for tools)
// ============================================================

export const ToolInputExampleSchema = z.object({
  input: z.record(z.unknown()),
  output: z.unknown().optional(),
  description: z.string().optional(),
});

export type ToolInputExample = z.infer<typeof ToolInputExampleSchema>;

// ============================================================
// Tool definition
// ============================================================

export const ToolDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-z_][a-z0-9_]*$/,
      'Tool name must be lowercase with underscores, starting with a letter or underscore',
    ),
  description: z
    .string()
    .min(1, 'Tool description is required')
    .max(1024, 'Tool description must be 1024 characters or less'),
  parameters: z.array(ToolParameterSchema),
  inputExamples: z.array(ToolInputExampleSchema).max(5).optional(),
  deferLoading: z.boolean().default(false),
  handler: ToolHandlerSchema,
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ============================================================
// Tool registry config (agent-level)
// ============================================================

export const ToolRegistryConfigSchema = z.object({
  tools: z.array(ToolDefinitionSchema),
  defaultModel: z.string().optional(),
  enableToolSearch: z.boolean().default(false),
});

export type ToolRegistryConfig = z.infer<typeof ToolRegistryConfigSchema>;

// ============================================================
// Tool search configuration
// ============================================================

export const ToolSearchConfigSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.6),
  maxResults: z.number().int().min(1).max(20).default(5),
  autoEnable: z.boolean().default(true),
  autoEnableThreshold: z.number().int().min(1).default(10),
});

export type ToolSearchConfig = z.infer<typeof ToolSearchConfigSchema>;
