// =============================================================================
// Email Sequence Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  EmailSequenceAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
  LandingPageAsset,
} from '../types';

const SYSTEM_PROMPT = `You are an expert email marketing strategist.
You write high-converting email sequences for product launches.
Every email drives to a single CTA. Your copy is concise, scannable, and persuasive.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(brief: LaunchBrief, landingPage: LandingPageAsset | null): string {
  const lpContext = landingPage
    ? `
## Landing Page Context (for consistency)
- Hero Headline: ${landingPage.hero.headline}
- Hero Subheadline: ${landingPage.hero.subheadline}
- CTA Text: ${landingPage.hero.ctaText}
- Feature Sections: ${landingPage.featureSections.map((f) => f.featureName).join(', ')}
- Closing CTA: ${landingPage.closingCta.headline}
- Social Proof Headline: ${landingPage.socialProof.headline}

Reference these landing page elements in emails to maintain messaging consistency.
Emails should feel like they're part of the SAME campaign as the landing page.`
    : '';

  return `Generate a 5-email launch sequence for:

## Product Details
- Product Name: ${brief.productName}
- Tagline: ${brief.tagline}
- Value Proposition: ${brief.valueProposition}
- Target Audience: ${brief.targetAudience}
- Pricing: ${brief.pricing}
- Launch Date: ${brief.launchDate}
- Landing Page URL: ${brief.landingPageUrl}
- Company: ${brief.companyName}
- Brand Voice: ${brief.brandVoice}
${brief.availabilityNote ? `- Availability: ${brief.availabilityNote}` : ''}
${brief.emailListSize ? `- Email List Size: ~${brief.emailListSize} subscribers` : ''}

## Key Features
${brief.keyFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description} — Benefit: ${f.benefit}`).join('\n')}

## Social Proof
${brief.quotes?.map((q) => `- "${q.text}" — ${q.author}${q.title ? `, ${q.title}` : ''}`).join('\n') || 'None provided'}
${brief.stats?.length ? `Stats: ${brief.stats.join(', ')}` : ''}
${lpContext}

## Email Sequence (5 emails)
1. **Announcement** (Day 0) — "We just launched X" — excitement, key value prop
2. **Feature Deep-Dive** (Day 2) — Pick the strongest feature, go deep
3. **Social Proof** (Day 4) — Testimonials, stats, case studies
4. **Urgency** (Day 6) — Limited time/availability angle (if applicable)
5. **Last Call** (Day 8) — Final reminder, FOMO, clear CTA

## Output Schema (return ONLY this JSON):
{
  "sequenceName": "${brief.productName} Launch Sequence",
  "totalEmails": 5,
  "emails": [
    {
      "id": "email-1",
      "order": 1,
      "name": "Announcement",
      "subject": "string — compelling subject line (40-60 chars)",
      "previewText": "string — email preview text (80-100 chars)",
      "body": "string — email body in Markdown. Keep concise. Use short paragraphs. Include formatting.",
      "ctaText": "string — CTA button text",
      "ctaUrl": "${brief.landingPageUrl}",
      "sendDelay": "Day 0"
    }
    // ... 4 more emails
  ]
}

CRITICAL RULES:
1. ALL ctaUrl values MUST be exactly "${brief.landingPageUrl}"
2. Feature names MUST match the brief exactly
3. Quotes MUST be verbatim — do NOT paraphrase
4. Pricing MUST say exactly "${brief.pricing}"
5. Each email body should reference specific landing page elements for consistency
6. Output ONLY the JSON object`;
}

async function generateWithOpenAI(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  model: string,
): Promise<string> {
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(brief, landingPage) },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  model: string,
): Promise<string> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(brief, landingPage) },
    ],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generateEmailSequence(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<EmailSequenceAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  const landingPage = context.assets.landingPage?.data ?? null;

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, landingPage, resolvedModel)
        : await generateWithAnthropic(context.brief, landingPage, resolvedModel);

    const data: EmailSequenceAsset = JSON.parse(raw);

    // Post-process: enforce URL consistency
    for (const email of data.emails) {
      email.ctaUrl = context.brief.landingPageUrl;
    }

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length,
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'emailSequence',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'emailSequence',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
