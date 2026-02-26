// =============================================================================
// A/B Variant Generator
// =============================================================================
//
// Takes an existing generated asset and produces an A/B variant pair.
//
// Strategy per asset type:
//   - Landing Page:  Variant A = pain-focused,      Variant B = aspiration-focused
//   - Email Sequence: Variant A = curiosity-driven, Variant B = outcome-driven
//   - Social Posts:   Variant A / B with different hook angles
//   - Press Release:  Skipped — single version only
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AssetType,
  AssetVariant,
  LaunchAsset,
  LaunchBrief,
  LLMProvider,
  VariantAngle,
  VariantEligibleAsset,
  VariantPair,
} from '../types';

// ---------------------------------------------------------------------------
// Angle mappings
// ---------------------------------------------------------------------------

const ANGLE_PAIRS: Record<VariantEligibleAsset, [VariantAngle, VariantAngle]> = {
  landingPage: ['pain', 'aspiration'],
  emailSequence: ['curiosity', 'outcome'],
  socialPosts: ['curiosity', 'pain'],
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert direct-response copywriter specializing in A/B testing.
Given an existing marketing asset (JSON) and a target angle, you rewrite the hooks,
headlines, and openers to match the new angle while keeping the core message, structure,
and factual content identical.

You ALWAYS output valid JSON matching the EXACT same schema as the input. No markdown, no
explanation — ONLY the JSON object.`;

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildVariantPrompt(
  assetType: VariantEligibleAsset,
  angle: VariantAngle,
  existingContent: unknown,
  brief: LaunchBrief,
): string {
  const angleDescriptions: Record<VariantAngle, string> = {
    pain: 'Emphasize the pain / frustration the audience currently feels. Lead with the problem, make it visceral, then position the product as the relief.',
    aspiration: 'Lead with the aspirational outcome — the ideal future state the audience wants. Paint the picture of success, then show how the product gets them there.',
    curiosity: 'Open with an unexpected insight, question, or counter-intuitive statement that makes the reader NEED to know more. Use information gaps.',
    outcome: 'Lead with specific, concrete results and outcomes. Numbers, timeframes, measurable improvements. Make the benefit undeniable.',
    default: 'Use the original angle as-is.',
  };

  return `Rewrite this ${assetType} asset to use a "${angle}" angle.

## Angle Definition
${angleDescriptions[angle]}

## Product Context
- Product: ${brief.productName}
- Tagline: ${brief.tagline}
- Value Proposition: ${brief.valueProposition}
- Target Audience: ${brief.targetAudience}
- Brand Voice: ${brief.brandVoice}

## Current Asset (JSON)
${JSON.stringify(existingContent, null, 2)}

## Rules
1. Rewrite ONLY hooks, headlines, subject lines, openers, and CTAs to match the "${angle}" angle
2. Keep all factual content, URLs, feature names, quotes, and stats EXACTLY the same
3. Maintain the same JSON structure and all fields
4. Brand voice must remain "${brief.brandVoice}"
5. Output ONLY the rewritten JSON object`;
}

// ---------------------------------------------------------------------------
// LLM callers
// ---------------------------------------------------------------------------

async function callOpenAI(prompt: string, model: string): Promise<string> {
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content || '';
}

async function callAnthropic(prompt: string, model: string): Promise<string> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: prompt },
    ],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

async function callLLM(
  prompt: string,
  provider: LLMProvider,
  model?: string,
): Promise<string> {
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  return provider === 'openai'
    ? callOpenAI(prompt, resolvedModel)
    : callAnthropic(prompt, resolvedModel);
}

// ---------------------------------------------------------------------------
// Eligibility check
// ---------------------------------------------------------------------------

const VARIANT_ELIGIBLE: Set<string> = new Set<string>([
  'landingPage',
  'emailSequence',
  'socialPosts',
]);

export function isVariantEligible(assetType: AssetType): assetType is VariantEligibleAsset {
  return VARIANT_ELIGIBLE.has(assetType);
}

// ---------------------------------------------------------------------------
// Extract hook from an asset for labelling
// ---------------------------------------------------------------------------

function extractHook(assetType: VariantEligibleAsset, content: unknown): string {
  const data = content as Record<string, unknown>;

  switch (assetType) {
    case 'landingPage': {
      const hero = data['hero'] as Record<string, unknown> | undefined;
      return (hero?.['headline'] as string) || '';
    }
    case 'emailSequence': {
      const emails = data['emails'] as Array<Record<string, unknown>> | undefined;
      return (emails?.[0]?.['subject'] as string) || '';
    }
    case 'socialPosts': {
      const twitter = data['twitter'] as Record<string, unknown> | undefined;
      const tweets = twitter?.['tweets'] as Array<Record<string, unknown>> | undefined;
      return (tweets?.[0]?.['text'] as string)?.slice(0, 100) || '';
    }
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an A/B variant pair from an existing generated asset.
 *
 * The original asset becomes Variant A (angle A), and the LLM generates
 * Variant B with the alternate angle. For assets that don't support variants
 * (e.g. pressRelease), this returns `null`.
 */
export async function generateVariantPair(
  asset: LaunchAsset,
  brief: LaunchBrief,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<VariantPair | null> {
  if (!isVariantEligible(asset.type)) {
    return null;
  }

  if (asset.status !== 'done' || asset.data === null) {
    throw new Error(`Cannot generate variants for ${asset.type}: asset is not ready (status: ${asset.status})`);
  }

  const eligibleType = asset.type as VariantEligibleAsset;
  const [angleA, angleB] = ANGLE_PAIRS[eligibleType];

  // Variant A: rewrite the original asset with angle A
  const promptA = buildVariantPrompt(eligibleType, angleA, asset.data, brief);
  const rawA = await callLLM(promptA, provider, model);
  const contentA: unknown = JSON.parse(rawA);

  // Variant B: rewrite the original asset with angle B
  const promptB = buildVariantPrompt(eligibleType, angleB, asset.data, brief);
  const rawB = await callLLM(promptB, provider, model);
  const contentB: unknown = JSON.parse(rawB);

  const variantA: AssetVariant = {
    angle: angleA,
    hook: extractHook(eligibleType, contentA),
    content: contentA,
  };

  const variantB: AssetVariant = {
    angle: angleB,
    hook: extractHook(eligibleType, contentB),
    content: contentB,
  };

  return {
    assetType: asset.type,
    variantA,
    variantB,
  };
}

/**
 * Generate variant pairs for all eligible assets in a set of generated assets.
 *
 * Returns a map of asset type → variant pair. Assets that are ineligible
 * or not yet generated are silently skipped.
 */
export async function generateAllVariants(
  assets: Record<string, LaunchAsset>,
  brief: LaunchBrief,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<Map<VariantEligibleAsset, VariantPair>> {
  const results = new Map<VariantEligibleAsset, VariantPair>();

  for (const [type, asset] of Object.entries(assets)) {
    if (!isVariantEligible(type as AssetType)) continue;
    if (asset.status !== 'done' || asset.data === null) continue;

    const pair = await generateVariantPair(asset, brief, provider, model);
    if (pair) {
      results.set(type as VariantEligibleAsset, pair);
    }
  }

  return results;
}
