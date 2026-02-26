/**
 * Model Escalation — Cost-Optimized LLM Calls
 *
 * Start with the cheapest model.  If the output fails Zod validation,
 * escalate to the next model in the chain.  For routine calls this
 * saves 80–90% because cheap models handle 90%+ of requests correctly.
 *
 * Escalation chain example:
 *   claude-3-haiku → claude-3-sonnet → claude-3-opus
 *   gpt-4o-mini   → gpt-4o          → gpt-4-turbo
 */

import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger';

// ============================================================
// Cost table (per 1K tokens, USD)
// ============================================================

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  // Anthropic
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const costs = MODEL_COSTS[model] || { input: 0.003, output: 0.015 };
  return (
    (inputTokens / 1000) * costs.input +
    (outputTokens / 1000) * costs.output
  );
}

// ============================================================
// Preset escalation chains
// ============================================================

export const ESCALATION_PRESETS = {
  conservative: ['gpt-4o-mini', 'gpt-4o'],
  balanced: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  aggressive: ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o'],
  anthropic_conservative: ['claude-3-haiku', 'claude-3-sonnet'],
  anthropic_balanced: [
    'claude-3-haiku',
    'claude-3-sonnet',
    'claude-3-opus',
  ],
  anthropic_aggressive: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
} as const;

// ============================================================
// Configuration
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
