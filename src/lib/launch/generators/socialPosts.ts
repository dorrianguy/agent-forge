// =============================================================================
// Social Posts Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  SocialPostsAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
  LandingPageAsset,
  PressReleaseAsset,
} from '../types';

const SYSTEM_PROMPT = `You are a social media strategist who writes viral launch posts.
You adapt tone and format for each platform's culture and conventions.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  pressRelease: PressReleaseAsset | null,
): string {
  const platforms = brief.socialPlatforms;

  const lpContext = landingPage
    ? `
## Landing Page Context
- Hero Headline: ${landingPage.hero.headline}
- Subheadline: ${landingPage.hero.subheadline}
- CTA: ${landingPage.hero.ctaText}
- Feature Headlines: ${landingPage.featureSections.map((f) => f.headline).join(' | ')}`
    : '';

  const prContext = pressRelease
    ? `
## Press Release Context
- PR Headline: ${pressRelease.headline}
- Lede: ${pressRelease.lede}`
    : '';

  // Build platform-specific instructions
  const platformInstructions: string[] = [];
  const schemaFields: string[] = [];

  if (platforms.includes('twitter')) {
    platformInstructions.push(`
### Twitter/X Thread (5-7 tweets)
- Tweet 1: Hook — grab attention, announce the launch
- Tweets 2-5: One key point each (feature, stat, quote)
- Tweet 6: Social proof or traction
- Final tweet: CTA with link to ${brief.landingPageUrl}
- Each tweet ≤ 280 chars. Use line breaks for readability.
- End thread with the landing page link.`);
    schemaFields.push(`"twitter": {
    "tweets": [
      { "order": 1, "text": "string — ≤280 chars", "hasMedia": false }
    ]
  }`);
  }

  if (platforms.includes('linkedin')) {
    platformInstructions.push(`
### LinkedIn Post
- Professional tone, story-driven
- Open with a hook (question or bold statement)
- 3-5 short paragraphs with line breaks
- End with CTA and link to ${brief.landingPageUrl}
- Include 3-5 relevant hashtags`);
    schemaFields.push(`"linkedin": {
    "text": "string — full post text with line breaks (\\n)",
    "hashtags": ["string"]
  }`);
  }

  if (platforms.includes('producthunt')) {
    platformInstructions.push(`
### Product Hunt
- Title: Product name — brief descriptor
- Tagline: ≤ 60 chars, punchy
- Description: 3-5 paragraphs, feature highlights, who it's for
- First comment: Personal, founder-voice, story behind the product
- Topics: 3-5 relevant PH topics`);
    schemaFields.push(`"producthunt": {
    "title": "string — product name + brief descriptor",
    "tagline": "string — ≤60 chars",
    "description": "string — 3-5 paragraphs with line breaks",
    "firstComment": "string — personal founder comment",
    "topics": ["string"]
  }`);
  }

  if (platforms.includes('hackernews')) {
    platformInstructions.push(`
### Hacker News (Show HN)
- Title format: "Show HN: ${brief.productName} — ${brief.tagline}"
- URL: ${brief.landingPageUrl}
- Comment: Technical, honest, explains what it does and why you built it
- HN culture: no hype, be genuine, mention technical decisions`);
    schemaFields.push(`"hackernews": {
    "title": "string — Show HN format",
    "url": "${brief.landingPageUrl}",
    "comment": "string — technical, genuine comment"
  }`);
  }

  if (platforms.includes('instagram')) {
    platformInstructions.push(`
### Instagram Post
- Caption: Hook + story + CTA (mention "link in bio")
- Visual, emoji-friendly (but not excessive)
- 10-15 relevant hashtags
- Alt text for accessibility`);
    schemaFields.push(`"instagram": {
    "caption": "string — full caption",
    "hashtags": ["string"],
    "altText": "string — image alt text"
  }`);
  }

  return `Generate social media posts for a product launch across: ${platforms.join(', ')}.

## Product Details
- Product Name: ${brief.productName}
- Tagline: ${brief.tagline}
- Value Proposition: ${brief.valueProposition}
- Target Audience: ${brief.targetAudience}
- Pricing: ${brief.pricing}
- Landing Page URL: ${brief.landingPageUrl}
- Company: ${brief.companyName}
- Brand Voice: ${brief.brandVoice}
${brief.founderName ? `- Founder: ${brief.founderName}` : ''}

## Key Features
${brief.keyFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.benefit}`).join('\n')}

## Social Proof
${brief.quotes?.map((q) => `- "${q.text}" — ${q.author}`).join('\n') || 'None'}
${brief.stats?.length ? `Stats: ${brief.stats.join(', ')}` : ''}
${lpContext}
${prContext}

## Platform-Specific Instructions
${platformInstructions.join('\n')}

## Output Schema (return ONLY this JSON):
{
  ${schemaFields.join(',\n  ')}
}

CRITICAL RULES:
1. ALL links MUST point to "${brief.landingPageUrl}"
2. Feature names MUST match the brief exactly
3. Quotes from the brief MUST be verbatim
4. Pricing MUST say exactly "${brief.pricing}"
5. HN url MUST be "${brief.landingPageUrl}"
6. Twitter thread: each tweet ≤ 280 characters
7. PH tagline ≤ 60 characters
8. Only generate posts for requested platforms: ${platforms.join(', ')}
9. Output ONLY the JSON object`;
}

async function generateWithOpenAI(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  pressRelease: PressReleaseAsset | null,
  model: string,
): Promise<string> {
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(brief, landingPage, pressRelease) },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  pressRelease: PressReleaseAsset | null,
  model: string,
): Promise<string> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(brief, landingPage, pressRelease) },
    ],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generateSocialPosts(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<SocialPostsAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  const landingPage = context.assets.landingPage?.data ?? null;
  const pressRelease = context.assets.pressRelease?.data ?? null;

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, landingPage, pressRelease, resolvedModel)
        : await generateWithAnthropic(context.brief, landingPage, pressRelease, resolvedModel);

    const data: SocialPostsAsset = JSON.parse(raw);

    // Post-process: enforce URL consistency
    if (data.hackernews) {
      data.hackernews.url = context.brief.landingPageUrl;
    }

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length,
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'socialPosts',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'socialPosts',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
