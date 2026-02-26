// =============================================================================
// Sales Enablement Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  SalesEnablementAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
  LandingPageAsset,
} from '../types';

const SYSTEM_PROMPT = `You are an expert B2B sales strategist who creates high-impact sales enablement materials.
You write concise, persuasive one-pagers, objection-handling scripts, and demo talking points.
Everything you produce is grounded in data, proof points, and customer outcomes.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(brief: LaunchBrief, landingPage: LandingPageAsset | null): string {
  const lpContext = landingPage
    ? `
## Landing Page Context (for consistency)
- Hero Headline: ${landingPage.hero.headline}
- Hero Subheadline: ${landingPage.hero.subheadline}
- CTA Text: ${landingPage.hero.ctaText}
- Feature Sections: ${landingPage.featureSections.map((f) => `${f.featureName}: ${f.headline}`).join(' | ')}
- Social Proof Headline: ${landingPage.socialProof.headline}
- Stats: ${landingPage.socialProof.stats.join(', ')}

Use these landing page elements to ensure messaging consistency across sales materials.`
    : '';

  return `Generate sales enablement materials for a product launch.

## Product Details
- Product Name: ${brief.productName}
- Tagline: ${brief.tagline}
- Value Proposition: ${brief.valueProposition}
- Target Audience: ${brief.targetAudience}
- Pricing: ${brief.pricing}
- Launch Date: ${brief.launchDate}
- Landing Page URL: ${brief.landingPageUrl}
- Signup URL: ${brief.signupUrl || brief.landingPageUrl}
- Demo URL: ${brief.demoUrl || brief.landingPageUrl}
- Company: ${brief.companyName}
${brief.founderName ? `- Founder: ${brief.founderName}${brief.founderTitle ? `, ${brief.founderTitle}` : ''}` : ''}
- Brand Voice: ${brief.brandVoice}

## Key Features
${brief.keyFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description} — Benefit: ${f.benefit}`).join('\n')}

## Social Proof
${brief.quotes?.map((q) => `- "${q.text}" — ${q.author}${q.title ? `, ${q.title}` : ''}${q.company ? ` at ${q.company}` : ''}`).join('\n') || 'None provided'}
${brief.stats?.length ? `\nStats: ${brief.stats.join(', ')}` : ''}
${lpContext}

## Materials to Generate

### 1. Sales One-Pager
A single-page document for sales reps to leave behind after meetings.
- Headline: compelling, benefit-driven (mirrors landing page messaging)
- Value Props: 3-5 bullet points, each a clear business outcome
- Proof Points: 2-4 data points, stats, or customer quotes from the brief
- Call to Action: clear next step (demo, trial, signup)
- Contact Info: company name + landing page URL

### 2. Objection-Handling Script (5-7 objections)
Common sales objections with structured responses:
- Objection: what the prospect says
- Reframe: reposition the concern as an opportunity
- Proof: specific data point, stat, or quote that addresses the concern
- Redirect: transition back to value / next step

### 3. Demo Talking Points
For each key feature, a structured demo sequence:
- Claim: the benefit statement
- Show This: what to demonstrate on screen
- Say This: the exact talk track
- Metric: the supporting data point or outcome

## Output Schema (return ONLY this JSON):
{
  "onePager": {
    "headline": "string — benefit-driven headline (8-12 words)",
    "valueProps": ["string — 3-5 clear business outcome statements"],
    "proofPoints": ["string — 2-4 stats or verbatim quotes from brief"],
    "callToAction": "string — clear next step with URL",
    "contactInfo": "string — company name + website"
  },
  "objectionScript": [
    {
      "objection": "string — common prospect concern",
      "reframe": "string — reposition as opportunity",
      "proof": "string — specific data/stat/quote",
      "redirect": "string — transition to value/next step"
    }
  ],
  "demoTalkingPoints": [
    {
      "claim": "string — the benefit statement",
      "showThis": "string — what to demonstrate",
      "sayThis": "string — exact talk track",
      "metric": "string — supporting data point"
    }
  ]
}

CRITICAL RULES:
1. Value props MUST be derived from the key features in the brief
2. Proof points MUST use verbatim stats/quotes from the brief — do NOT invent data
3. Feature names in demo talking points MUST match the brief exactly
4. Pricing references MUST say exactly "${brief.pricing}"
5. Contact info MUST include "${brief.landingPageUrl}"
6. Generate exactly 5-7 objections
7. Generate one demo talking point per key feature (${brief.keyFeatures.length} total)
8. Output ONLY the JSON object`;
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

export async function generateSalesEnablement(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<SalesEnablementAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  const landingPage = context.assets.landingPage?.data ?? null;

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, landingPage, resolvedModel)
        : await generateWithAnthropic(context.brief, landingPage, resolvedModel);

    const data: SalesEnablementAsset = JSON.parse(raw);

    // Post-process: enforce URL and contact consistency
    data.onePager.contactInfo = `${context.brief.companyName} — ${context.brief.landingPageUrl}`;
    if (!data.onePager.callToAction.includes(context.brief.landingPageUrl)) {
      data.onePager.callToAction = `${data.onePager.callToAction} → ${context.brief.signupUrl || context.brief.landingPageUrl}`;
    }

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length,
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'salesEnablement',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'salesEnablement',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
