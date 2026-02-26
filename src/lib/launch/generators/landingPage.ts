// =============================================================================
// Landing Page Copy Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  LandingPageAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
} from '../types';

const SYSTEM_PROMPT = `You are an expert conversion copywriter specializing in SaaS landing pages.
You write clear, benefit-driven copy that converts visitors into signups.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(brief: LaunchBrief): string {
  return `Generate structured landing page copy for a product launch.

## Product Details
- Product Name: ${brief.productName}
- Tagline: ${brief.tagline}
- Value Proposition: ${brief.valueProposition}
- Target Audience: ${brief.targetAudience}
- Pricing: ${brief.pricing}
- Launch Date: ${brief.launchDate}
- Landing Page URL: ${brief.landingPageUrl}
- Signup URL: ${brief.signupUrl || brief.landingPageUrl}
- Company: ${brief.companyName}
- Brand Voice: ${brief.brandVoice}
${brief.availabilityNote ? `- Availability: ${brief.availabilityNote}` : ''}

## Key Features
${brief.keyFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description} — Benefit: ${f.benefit}`).join('\n')}

## Social Proof
${brief.quotes?.map((q) => `- "${q.text}" — ${q.author}${q.title ? `, ${q.title}` : ''}${q.company ? ` at ${q.company}` : ''}`).join('\n') || 'None provided'}
${brief.stats?.length ? `\nStats: ${brief.stats.join(', ')}` : ''}

## Output Schema (return ONLY this JSON, no wrapping):
{
  "hero": {
    "headline": "string — compelling, benefit-driven headline (8-12 words)",
    "subheadline": "string — supporting detail expanding on the headline (15-25 words)",
    "ctaText": "string — action-oriented button text (2-5 words)",
    "ctaUrl": "${brief.signupUrl || brief.landingPageUrl}"
  },
  "featureSections": [
    // One per key feature, in order
    {
      "featureName": "string — exact feature name from brief",
      "headline": "string — benefit-focused section headline",
      "description": "string — 2-3 sentences explaining the feature",
      "benefit": "string — why the user cares"
    }
  ],
  "socialProof": {
    "headline": "string — social proof section headline",
    "testimonials": [
      // Use EXACT quote text from brief — do NOT paraphrase
      { "quote": "string", "author": "string", "title": "string or null", "company": "string or null" }
    ],
    "stats": ["string array — stat badges"]
  },
  "faq": [
    // 4-6 FAQs relevant to the product
    { "question": "string", "answer": "string" }
  ],
  "closingCta": {
    "headline": "string — urgency-driven closing headline",
    "subheadline": "string — reinforce value or scarcity",
    "ctaText": "string — final CTA button text",
    "ctaUrl": "${brief.signupUrl || brief.landingPageUrl}"
  },
  "meta": {
    "title": "string — SEO title (50-60 chars)",
    "description": "string — SEO meta description (150-160 chars)",
    "ogTitle": "string — Open Graph title",
    "ogDescription": "string — Open Graph description",
    "ogImageAlt": "string — alt text for OG image",
    "twitterCard": "summary_large_image"
  }
}

CRITICAL RULES:
1. All ctaUrl values MUST be exactly "${brief.signupUrl || brief.landingPageUrl}"
2. Feature names MUST match the brief exactly — do NOT rename them
3. Quotes MUST be verbatim from the brief — do NOT paraphrase
4. Pricing references MUST say exactly "${brief.pricing}"
5. Output ONLY the JSON object, nothing else`;
}

async function generateWithOpenAI(brief: LaunchBrief, model: string): Promise<string> {
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(brief) },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(brief: LaunchBrief, model: string): Promise<string> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(brief) },
    ],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generateLandingPage(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<LandingPageAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, resolvedModel)
        : await generateWithAnthropic(context.brief, resolvedModel);

    const data: LandingPageAsset = JSON.parse(raw);

    // Post-process: enforce URL consistency
    const targetUrl = context.brief.signupUrl || context.brief.landingPageUrl;
    data.hero.ctaUrl = targetUrl;
    data.closingCta.ctaUrl = targetUrl;

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length, // approximation; real usage comes from response
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'landingPage',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'landingPage',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
