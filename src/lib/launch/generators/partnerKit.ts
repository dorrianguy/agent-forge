// =============================================================================
// Partner Kit Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  PartnerKitAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
  LandingPageAsset,
  SocialPostsAsset,
} from '../types';

const SYSTEM_PROMPT = `You are an expert partner marketing strategist.
You create swipe copy and co-branded materials that partners and affiliates can use to promote products.
Your copy is ready-to-use, professional, and optimized for each channel.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  socialPosts: SocialPostsAsset | null,
): string {
  const lpContext = landingPage
    ? `
## Landing Page Context (for consistency)
- Hero Headline: ${landingPage.hero.headline}
- Hero Subheadline: ${landingPage.hero.subheadline}
- CTA Text: ${landingPage.hero.ctaText}
- Feature Headlines: ${landingPage.featureSections.map((f) => f.headline).join(' | ')}
- Social Proof Headline: ${landingPage.socialProof.headline}
- Stats: ${landingPage.socialProof.stats.join(', ')}

Partner materials should mirror the landing page messaging and drive traffic to the same URL.`
    : '';

  const spContext = socialPosts
    ? `
## Social Posts Context (for tone reference)
${socialPosts.twitter ? `- Twitter Thread Hook: ${socialPosts.twitter.tweets[0]?.text || 'N/A'}` : ''}
${socialPosts.linkedin ? `- LinkedIn Post Opening: ${socialPosts.linkedin.text.split('\n')[0] || 'N/A'}` : ''}

Use similar tone and angles as the existing social posts, but adapt for partner audiences.`
    : '';

  return `Generate partner/affiliate marketing kit for a product launch.

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
${brief.founderName ? `- Founder: ${brief.founderName}${brief.founderTitle ? `, ${brief.founderTitle}` : ''}` : ''}

## Key Features
${brief.keyFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description} — Benefit: ${f.benefit}`).join('\n')}

## Social Proof
${brief.quotes?.map((q) => `- "${q.text}" — ${q.author}${q.title ? `, ${q.title}` : ''}${q.company ? ` at ${q.company}` : ''}`).join('\n') || 'None provided'}
${brief.stats?.length ? `\nStats: ${brief.stats.join(', ')}` : ''}
${lpContext}
${spContext}

## Materials to Generate

### 1. Swipe Copy (ready-to-post for partners)
- **Twitter:** 2-3 tweet options partners can copy/paste. Each ≤ 280 chars. Include ${brief.landingPageUrl}.
- **LinkedIn:** A 3-4 paragraph LinkedIn post partners can customize. Include ${brief.landingPageUrl}.
- **Email Blurb:** A 2-3 paragraph blurb for partner newsletters. Professional, benefit-focused. Include ${brief.landingPageUrl}.

### 2. Co-Branded One-Pager
Positioning document partners can co-brand:
- Product Positioning: 2-3 sentence elevator pitch
- Proof Points: 3-5 data points / stats / outcomes
- Call to Action: what the partner should tell their audience to do

## Output Schema (return ONLY this JSON):
{
  "swipeCopy": {
    "twitter": [
      "string — tweet option 1 (≤280 chars, includes landing page URL)",
      "string — tweet option 2",
      "string — tweet option 3 (optional)"
    ],
    "linkedin": "string — full LinkedIn post with line breaks (\\n), includes landing page URL",
    "emailBlurb": "string — 2-3 paragraph email blurb with line breaks (\\n), includes landing page URL"
  },
  "coBrandedOnePager": {
    "productPositioning": "string — 2-3 sentence elevator pitch",
    "proofPoints": ["string — 3-5 data-backed outcomes"],
    "callToAction": "string — what partners tell their audience"
  }
}

CRITICAL RULES:
1. ALL swipe copy MUST include "${brief.landingPageUrl}" as the link
2. Twitter tweets MUST be ≤ 280 characters each
3. Quotes from the brief MUST be verbatim — do NOT paraphrase
4. Pricing references MUST say exactly "${brief.pricing}"
5. Proof points MUST use real stats/quotes from the brief — do NOT invent data
6. Swipe copy should be ready-to-use (partners copy/paste with minimal edits)
7. Output ONLY the JSON object`;
}

async function generateWithOpenAI(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  socialPosts: SocialPostsAsset | null,
  model: string,
): Promise<string> {
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(brief, landingPage, socialPosts) },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(
  brief: LaunchBrief,
  landingPage: LandingPageAsset | null,
  socialPosts: SocialPostsAsset | null,
  model: string,
): Promise<string> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(brief, landingPage, socialPosts) },
    ],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generatePartnerKit(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<PartnerKitAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  const landingPage = context.assets.landingPage?.data ?? null;
  const socialPosts = context.assets.socialPosts?.data ?? null;

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, landingPage, socialPosts, resolvedModel)
        : await generateWithAnthropic(context.brief, landingPage, socialPosts, resolvedModel);

    const data: PartnerKitAsset = JSON.parse(raw);

    // Post-process: enforce URL consistency in swipe copy
    const expectedUrl = context.brief.landingPageUrl;

    data.swipeCopy.twitter = data.swipeCopy.twitter.map((tweet) => {
      if (!tweet.includes(expectedUrl)) {
        // Append URL if missing (may exceed 280 chars — validator will catch)
        return `${tweet}\n${expectedUrl}`;
      }
      return tweet;
    });

    if (!data.swipeCopy.linkedin.includes(expectedUrl)) {
      data.swipeCopy.linkedin = `${data.swipeCopy.linkedin}\n\n${expectedUrl}`;
    }

    if (!data.swipeCopy.emailBlurb.includes(expectedUrl)) {
      data.swipeCopy.emailBlurb = `${data.swipeCopy.emailBlurb}\n\nLearn more: ${expectedUrl}`;
    }

    if (!data.coBrandedOnePager.callToAction.includes(expectedUrl)) {
      data.coBrandedOnePager.callToAction = `${data.coBrandedOnePager.callToAction} → ${expectedUrl}`;
    }

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length,
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'partnerKit',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'partnerKit',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
