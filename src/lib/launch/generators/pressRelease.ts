// =============================================================================
// Press Release Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  PressReleaseAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
  LandingPageAsset,
} from '../types';

const SYSTEM_PROMPT = `You are a seasoned tech PR writer.
You write press releases in standard AP style with inverted pyramid structure.
Your releases are factual, quotable, and journalist-friendly.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
): string {
  const lpContext = landingPage
    ? `
## Landing Page Context (for consistency)
- Hero Headline: ${landingPage.hero.headline}
- Hero Subheadline: ${landingPage.hero.subheadline}
- Feature Sections: ${landingPage.featureSections.map((f) => `${f.featureName}: ${f.headline}`).join('; ')}
- Meta Description: ${landingPage.meta.description}

Reference the landing page URL (${brief.landingPageUrl}) in the release.
Messaging should align with the landing page copy.`
    : '';

  return `Generate a press release for a product launch.

## Product Details
- Product Name: ${brief.productName}
- Tagline: ${brief.tagline}
- Value Proposition: ${brief.valueProposition}
- Target Audience: ${brief.targetAudience}
- Pricing: ${brief.pricing}
- Launch Date: ${brief.launchDate}
- Landing Page URL: ${brief.landingPageUrl}
- Company: ${brief.companyName}
${brief.founderName ? `- Founder: ${brief.founderName}${brief.founderTitle ? `, ${brief.founderTitle}` : ''}` : ''}
- Brand Voice: ${brief.brandVoice}
${brief.availabilityNote ? `- Availability: ${brief.availabilityNote}` : ''}

## Key Features
${brief.keyFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description}`).join('\n')}

## Quotes (use VERBATIM — do NOT paraphrase)
${brief.quotes?.map((q) => `- "${q.text}" — ${q.author}${q.title ? `, ${q.title}` : ''}${q.company ? ` at ${q.company}` : ''}`).join('\n') || 'No quotes provided — generate a founder quote if founderName is available.'}

## Stats
${brief.stats?.join(', ') || 'None provided'}
${lpContext}

## Output Schema (return ONLY this JSON):
{
  "headline": "string — press release headline, factual and newsworthy",
  "subheadline": "string — optional supporting headline",
  "dateline": "string — e.g. 'SAN FRANCISCO, ${new Date(brief.launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}'",
  "lede": "string — opening paragraph, answers who/what/when/where/why (2-3 sentences)",
  "bodyParagraphs": [
    "string — each is a full paragraph covering features, market context, or details"
  ],
  "quotes": [
    {
      "text": "string — EXACT quote text from brief (or generated founder quote)",
      "attribution": "string — 'Name, Title at Company' or 'Name, Title'"
    }
  ],
  "availability": "string — when and how to access the product, with URL",
  "boilerplate": "string — About [Company] paragraph",
  "contactInfo": {
    "name": "string — PR contact name",
    "email": "string — press@company.com format",
    "website": "${brief.landingPageUrl}"
  },
  "url": "${brief.landingPageUrl}"
}

CRITICAL RULES:
1. The url and contactInfo.website MUST be exactly "${brief.landingPageUrl}"
2. Quotes from the brief MUST be used VERBATIM — absolutely no paraphrasing
3. Pricing MUST reference exactly "${brief.pricing}"
4. Feature names MUST match the brief exactly
5. The launch date in the dateline must be ${brief.launchDate}
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
    temperature: 0.6,
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

export async function generatePressRelease(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<PressReleaseAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  const landingPage = context.assets.landingPage?.data ?? null;

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, landingPage, resolvedModel)
        : await generateWithAnthropic(context.brief, landingPage, resolvedModel);

    const data: PressReleaseAsset = JSON.parse(raw);

    // Post-process: enforce URL consistency
    data.url = context.brief.landingPageUrl;
    if (data.contactInfo) {
      data.contactInfo.website = context.brief.landingPageUrl;
    }

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length,
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'pressRelease',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'pressRelease',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
