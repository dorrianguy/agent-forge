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
 */

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
// ESCALATION ENGINE
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

export interface EscalationResult {
  shouldEscalate: boolean;
  nextModel: string | null;
  reason: string;
  costDelta: number; // Estimated additional cost
}

/**
 * Determine if we should escalate to a more capable model.
 */
export function shouldEscalate(ctx: EscalationContext): EscalationResult {
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
