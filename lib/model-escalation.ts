/**
 * Agent Forge - Model Escalation
 *
 * Start cheap (Haiku), escalate to Sonnet/Opus only when needed.
 * 80-90% cost savings on routine queries.
 *
 * Escalation triggers:
 *   - Tool use failures (schema validation errors)
 *   - Complex multi-step reasoning
 *   - User explicitly requests better quality
 *   - Content that smaller models handle poorly
 *
 * Also exports escalatingCall/ESCALATION_PRESETS for schema-based
 * structured-output flows that validate with Zod and escalate on failure.
 */

import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger';

// ============================================================
// MODEL TIERS
// ============================================================

export interface ModelTier {
  id: string;
  provider: 'anthropic' | 'openai';
  costPer1kInput: number;  // USD
  costPer1kOutput: number; // USD
  maxTokens: number;
  supportsToolUse: boolean;
  supportsStreaming: boolean;
}

const ANTHROPIC_MODELS: Record<string, ModelTier> = {
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    maxTokens: 8192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 8192,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    maxTokens: 4096,
    supportsToolUse: true,
    supportsStreaming: true,
  },
};

const OPENAI_MODELS: Record<string, ModelTier> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    maxTokens: 4096,
    supportsToolUse: true,
    supportsStreaming: true,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    maxTokens: 4096,
    supportsToolUse: true,
    supportsStreaming: true,
  },
};

// ============================================================
// ESCALATION CHAIN
// ============================================================

/** Anthropic escalation: Haiku -> Sonnet -> Opus */
const ANTHROPIC_CHAIN = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20250929',
  'claude-opus-4-6',
];

/** OpenAI escalation: Mini -> Full */
const OPENAI_CHAIN = ['gpt-4o-mini', 'gpt-4o'];

// ============================================================
// ESCALATION PRESETS (for escalatingCall)
// ============================================================

export const ESCALATION_PRESETS = {
  conservative: ['gpt-4o-mini', 'gpt-4o'],
  balanced: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  aggressive: ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o'],
  anthropic_conservative: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929'],
  anthropic_balanced: [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-6',
  ],
  anthropic_aggressive: [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-6',
  ],
} as const;

// ============================================================
// ESCALATION ENGINE (context-based)
// ============================================================

export interface EscalationContext {
  /** Current model being used */
  currentModel: string;
  /** Number of failed attempts at current tier */
  failureCount: number;
  /** Type of failures encountered */
  failureTypes: EscalationReason[];
  /** Total cost so far for this conversation */
  totalCostUsd: number;
  /** Maximum cost allowed before stopping escalation */
  maxCostUsd?: number;
}

export type EscalationReason =
  | 'tool_schema_error'     // LLM produced invalid tool call JSON
  | 'json_parse_error'      // Failed to parse structured output
  | 'empty_response'        // Model returned empty/useless response
  | 'quality_flag'          // User flagged response as low quality
  | 'complexity_detected'   // Multi-step reasoning detected
  | 'max_retries';          // Exhausted retries at current tier

export interface EscalationDecision {
  shouldEscalate: boolean;
  nextModel: string | null;
  reason: string;
  costDelta: number; // Estimated additional cost
}

/**
 * Determine if we should escalate to a more capable model.
 */
export function shouldEscalate(ctx: EscalationContext): EscalationDecision {
  const chain = getChainForModel(ctx.currentModel);
  if (!chain) {
    return { shouldEscalate: false, nextModel: null, reason: 'Unknown model', costDelta: 0 };
  }

  const currentIndex = chain.indexOf(ctx.currentModel);
  if (currentIndex === -1 || currentIndex >= chain.length - 1) {
    return {
      shouldEscalate: false,
      nextModel: null,
      reason: 'Already at highest tier',
      costDelta: 0,
    };
  }

  // Check cost cap
  if (ctx.maxCostUsd && ctx.totalCostUsd >= ctx.maxCostUsd) {
    return {
      shouldEscalate: false,
      nextModel: null,
      reason: 'Cost cap reached',
      costDelta: 0,
    };
  }

  const nextModel = chain[currentIndex + 1];

  // Escalation rules
  const shouldGo =
    ctx.failureCount >= 2 ||
    ctx.failureTypes.includes('tool_schema_error') ||
    ctx.failureTypes.includes('json_parse_error') ||
    ctx.failureTypes.includes('quality_flag');

  if (!shouldGo) {
    return { shouldEscalate: false, nextModel: null, reason: 'No escalation needed', costDelta: 0 };
  }

  const reason = ctx.failureTypes.length > 0
    ? `Escalating due to: ${ctx.failureTypes.join(', ')}`
    : `Escalating after ${ctx.failureCount} failures`;

  logger.info('Model escalation triggered', {
    from: ctx.currentModel,
    to: nextModel,
    reason,
    failureCount: ctx.failureCount,
  });

  return {
    shouldEscalate: true,
    nextModel,
    reason,
    costDelta: estimateCostDelta(ctx.currentModel, nextModel),
  };
}

/**
 * Get the starting model for a provider.
 * Always starts at the cheapest tier.
 */
export function getStartingModel(provider: 'anthropic' | 'openai'): string {
  return provider === 'anthropic' ? ANTHROPIC_CHAIN[0] : OPENAI_CHAIN[0];
}

/**
 * Get model tier info for cost calculations.
 */
export function getModelTier(modelId: string): ModelTier | undefined {
  return ANTHROPIC_MODELS[modelId] || OPENAI_MODELS[modelId];
}

/**
 * Estimate cost for a request.
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const tier = getModelTier(modelId);
  if (!tier) return 0;
  return (
    (inputTokens / 1000) * tier.costPer1kInput +
    (outputTokens / 1000) * tier.costPer1kOutput
  );
}

/**
 * Create a fresh escalation context starting at the cheapest model.
 */
export function createEscalationContext(
  provider: 'anthropic' | 'openai',
  maxCostUsd?: number,
): EscalationContext {
  return {
    currentModel: getStartingModel(provider),
    failureCount: 0,
    failureTypes: [],
    totalCostUsd: 0,
    maxCostUsd,
  };
}

/**
 * Record a failure and potentially escalate.
 * Returns the model to use for the next attempt.
 */
export function recordFailureAndEscalate(
  ctx: EscalationContext,
  reason: EscalationReason,
): { model: string; escalated: boolean } {
  ctx.failureCount += 1;
  if (!ctx.failureTypes.includes(reason)) {
    ctx.failureTypes.push(reason);
  }

  const result = shouldEscalate(ctx);
  if (result.shouldEscalate && result.nextModel) {
    ctx.currentModel = result.nextModel;
    ctx.failureCount = 0;
    ctx.failureTypes = [];
    return { model: result.nextModel, escalated: true };
  }

  return { model: ctx.currentModel, escalated: false };
}

// ============================================================
// ESCALATING CALL (schema-based, for structured outputs)
// ============================================================

export interface EscalationConfig {
  /** Ordered list of models, cheapest first. */
  models: string[];
  /** Max attempts across all models (default: models.length). */
  maxRetries?: number;
  /** Optional custom validator. If omitted, Zod schema validation is used. */
  validateOutput?: (output: unknown) => boolean;
  /** System prompt for the LLM call. */
  systemPrompt?: string;
  /** Temperature (passed to every model). */
  temperature?: number;
  /** Max tokens for response. */
  maxTokens?: number;
}

export interface EscalationResult<T> {
  /** The validated, parsed result. */
  result: T;
  /** Which model produced the successful result. */
  model: string;
  /** How many attempts were made (across all models). */
  attempts: number;
  /** Estimated cost in USD for the successful call only. */
  cost: number;
  /** Estimated savings compared to always using the most expensive model. */
  costSaved: number;
  /** Token usage for the successful call. */
  tokens: { input: number; output: number; total: number };
}

// ============================================================
// Lazy clients
// ============================================================

let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

function getAnthropic(): Anthropic {
  if (!_anthropic)
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// ============================================================
// Core: raw LLM call (provider-aware)
// ============================================================

interface RawLLMResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callLLM(
  model: string,
  prompt: string,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<RawLLMResult> {
  const isAnthropic = model.startsWith('claude');

  if (isAnthropic) {
    const response = await getAnthropic().messages.create({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    return {
      content: textBlock?.type === 'text' ? textBlock.text : '',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  // OpenAI-compatible
  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
  };
}

// ============================================================
// JSON extraction helper
// ============================================================

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // noop
  }

  // Try extracting JSON from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // noop
    }
  }

  // Try extracting first JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // noop
    }
  }

  throw new Error('No valid JSON found in response');
}

// ============================================================
// Escalating call
// ============================================================

/**
 * Make an LLM call that starts cheap and escalates on validation failure.
 *
 * @param schema   Zod schema to validate and parse the LLM response
 * @param prompt   User prompt
 * @param config   Escalation configuration
 * @returns        Validated result + metadata
 *
 * @example
 * ```ts
 * const { result, model, costSaved } = await escalatingCall(
 *   AgentConfigSchema,
 *   "Create a customer support agent...",
 *   {
 *     models: ['gpt-4o-mini', 'gpt-4o'],
 *     systemPrompt: 'Return valid JSON...',
 *   }
 * );
 * ```
 */
export async function escalatingCall<T>(
  schema: z.ZodType<T>,
  prompt: string,
  config: EscalationConfig,
): Promise<EscalationResult<T>> {
  const {
    models,
    maxRetries = models.length,
    validateOutput,
    systemPrompt = 'You are a helpful assistant. Return valid JSON.',
    temperature = 0.7,
    maxTokens = 2048,
  } = config;

  if (models.length === 0) {
    throw new Error('EscalationConfig.models must have at least one model');
  }

  const mostExpensiveModel = models[models.length - 1];
  let lastError: Error | null = null;
  let attempt = 0;

  for (let i = 0; i < models.length && attempt < maxRetries; i++) {
    const model = models[i];
    attempt++;

    try {
      const raw = await callLLM(
        model,
        prompt,
        systemPrompt,
        temperature,
        maxTokens,
      );

      // Extract JSON from response
      const parsed = extractJSON(raw.content);

      // Custom validation if provided
      if (validateOutput && !validateOutput(parsed)) {
        logger.info(
          `Model escalation: ${model} output failed custom validation, escalating`,
          { attempt },
        );
        continue;
      }

      // Zod validation
      const zodResult = schema.safeParse(parsed);
      if (!zodResult.success) {
        logger.info(
          `Model escalation: ${model} output failed Zod validation, escalating`,
          {
            attempt,
            errors: zodResult.error.issues.slice(0, 3),
          },
        );
        lastError = new Error(
          `Zod validation failed: ${zodResult.error.issues.map((i) => i.message).join('; ')}`,
        );
        continue;
      }

      // Success!
      const actualCost = estimateCost(
        model,
        raw.inputTokens,
        raw.outputTokens,
      );
      const worstCaseCost = estimateCost(
        mostExpensiveModel,
        raw.inputTokens,
        raw.outputTokens,
      );

      return {
        result: zodResult.data,
        model,
        attempts: attempt,
        cost: actualCost,
        costSaved: Math.max(0, worstCaseCost - actualCost),
        tokens: {
          input: raw.inputTokens,
          output: raw.outputTokens,
          total: raw.inputTokens + raw.outputTokens,
        },
      };
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(String(err));
      logger.error(
        `Model escalation: ${model} call failed, escalating`,
        lastError,
        { attempt },
      );
    }
  }

  throw new Error(
    `All models exhausted after ${attempt} attempt(s). Last error: ${lastError?.message || 'unknown'}`,
  );
}

/**
 * Convenience: run an escalating call using a named preset.
 */
export async function escalatingCallPreset<T>(
  schema: z.ZodType<T>,
  prompt: string,
  preset: keyof typeof ESCALATION_PRESETS,
  overrides: Partial<EscalationConfig> = {},
): Promise<EscalationResult<T>> {
  return escalatingCall(schema, prompt, {
    models: [...ESCALATION_PRESETS[preset]],
    ...overrides,
  });
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function getChainForModel(modelId: string): string[] | null {
  if (ANTHROPIC_CHAIN.includes(modelId)) return ANTHROPIC_CHAIN;
  if (OPENAI_CHAIN.includes(modelId)) return OPENAI_CHAIN;
  return null;
}

function estimateCostDelta(fromModel: string, toModel: string): number {
  const fromTier = getModelTier(fromModel);
  const toTier = getModelTier(toModel);
  if (!fromTier || !toTier) return 0;
  // Estimate for a typical ~500 input / ~200 output token request
  const fromCost = estimateCost(fromModel, 500, 200);
  const toCost = estimateCost(toModel, 500, 200);
  return toCost - fromCost;
}
