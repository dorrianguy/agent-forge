// =============================================================================
// Video Script Generator
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LaunchBrief,
  VideoScriptAsset,
  LaunchAsset,
  AssetMetadata,
  LLMProvider,
  PipelineContext,
  LandingPageAsset,
} from '../types';

const SYSTEM_PROMPT = `You are an expert video scriptwriter specializing in product launch videos.
You write punchy, visual scripts with precise timing for teaser and explainer videos.
Every scene has a voiceover, visual direction, and reference to the source material.
You ALWAYS output valid JSON matching the exact schema provided. No markdown, no explanation — ONLY the JSON object.`;

function buildUserPrompt(brief: LaunchBrief, landingPage: LandingPageAsset | null): string {
  const lpContext = landingPage
    ? `
## Landing Page Context (for consistency)
- Hero Headline: ${landingPage.hero.headline}
- Hero Subheadline: ${landingPage.hero.subheadline}
- CTA Text: ${landingPage.hero.ctaText}
- Feature Sections: ${landingPage.featureSections.map((f) => `${f.featureName}: ${f.headline} — ${f.benefit}`).join('\n  ')}
- Social Proof Headline: ${landingPage.socialProof.headline}
- Stats: ${landingPage.socialProof.stats.join(', ')}
- Closing CTA: ${landingPage.closingCta.headline}

Video scripts should mirror the landing page messaging and use the same language.`
    : '';

  return `Generate two video scripts for a product launch.

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

## Video 1: 30-Second Teaser (totalDuration = 30)
Structure:
- **Scene 1 — Hook (5s):** Attention-grabbing opening. State the problem or bold claim.
- **Scene 2 — Core Claim (15s):** The main value proposition with supporting visual.
- **Scene 3 — CTA (10s):** Clear call to action with ${brief.landingPageUrl}.

## Video 2: 60-Second Explainer (totalDuration = 60)
Structure:
- **Scene 1 — Hook (5s):** Problem statement or attention hook.
- **Scene 2 — Claim 1 with proof (15s):** First key feature + supporting data.
- **Scene 3 — Claim 2 with proof (15s):** Second key feature + supporting data.
- **Scene 4 — Claim 3 with proof (15s):** Third key feature + supporting data.
- **Scene 5 — CTA (10s):** Clear call to action with ${brief.landingPageUrl}.

## Scene Schema
Each scene MUST have:
- duration: number of seconds
- voiceover: the narrator's exact words
- visualDescription: what appears on screen
- textOverlay: text shown on screen (optional, use for key stats/URL)
- cmdSource: which brief element this scene pulls from (e.g. "valueProposition", "keyFeatures[0]", "stats[1]", "tagline")

## Output Schema (return ONLY this JSON):
{
  "teaser30s": {
    "scenes": [
      {
        "duration": 5,
        "voiceover": "string — hook narration",
        "visualDescription": "string — what we see",
        "textOverlay": "string or null",
        "cmdSource": "string — brief element reference"
      },
      {
        "duration": 15,
        "voiceover": "string — core claim narration",
        "visualDescription": "string — what we see",
        "textOverlay": "string or null",
        "cmdSource": "string — brief element reference"
      },
      {
        "duration": 10,
        "voiceover": "string — CTA narration",
        "visualDescription": "string — what we see",
        "textOverlay": "${brief.landingPageUrl}",
        "cmdSource": "callToAction"
      }
    ],
    "totalDuration": 30
  },
  "explainer60s": {
    "scenes": [
      {
        "duration": 5,
        "voiceover": "string — hook",
        "visualDescription": "string",
        "textOverlay": "string or null",
        "cmdSource": "string"
      },
      {
        "duration": 15,
        "voiceover": "string — claim 1",
        "visualDescription": "string",
        "textOverlay": "string or null",
        "cmdSource": "string"
      },
      {
        "duration": 15,
        "voiceover": "string — claim 2",
        "visualDescription": "string",
        "textOverlay": "string or null",
        "cmdSource": "string"
      },
      {
        "duration": 15,
        "voiceover": "string — claim 3",
        "visualDescription": "string",
        "textOverlay": "string or null",
        "cmdSource": "string"
      },
      {
        "duration": 10,
        "voiceover": "string — CTA",
        "visualDescription": "string",
        "textOverlay": "${brief.landingPageUrl}",
        "cmdSource": "callToAction"
      }
    ],
    "totalDuration": 60
  }
}

CRITICAL RULES:
1. Scene durations in teaser30s MUST sum to exactly 30 seconds
2. Scene durations in explainer60s MUST sum to exactly 60 seconds
3. The CTA scene textOverlay MUST include "${brief.landingPageUrl}"
4. cmdSource MUST reference actual brief elements (keyFeatures[N], valueProposition, tagline, stats[N], quotes[N])
5. Voiceover text should be speakable at ~150 words/minute (hook ≈ 12 words, 15s ≈ 37 words, 10s CTA ≈ 25 words)
6. Feature names in voiceover MUST match the brief exactly
7. Pricing references MUST say exactly "${brief.pricing}"
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

export async function generateVideoScript(
  context: PipelineContext,
  provider: LLMProvider = 'openai',
  model?: string,
): Promise<LaunchAsset<VideoScriptAsset>> {
  const start = Date.now();
  const resolvedModel =
    model || (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-20250514');

  const landingPage = context.assets.landingPage?.data ?? null;

  try {
    const raw =
      provider === 'openai'
        ? await generateWithOpenAI(context.brief, landingPage, resolvedModel)
        : await generateWithAnthropic(context.brief, landingPage, resolvedModel);

    const data: VideoScriptAsset = JSON.parse(raw);

    // Post-process: enforce duration totals
    const teaser30sSum = data.teaser30s.scenes.reduce((sum, s) => sum + s.duration, 0);
    data.teaser30s.totalDuration = teaser30sSum;

    const explainer60sSum = data.explainer60s.scenes.reduce((sum, s) => sum + s.duration, 0);
    data.explainer60s.totalDuration = explainer60sSum;

    // Post-process: enforce URL in CTA text overlays
    const expectedUrl = context.brief.landingPageUrl;
    const enforceCTAOverlay = (scenes: typeof data.teaser30s.scenes): void => {
      const lastScene = scenes[scenes.length - 1];
      if (lastScene && (!lastScene.textOverlay || !lastScene.textOverlay.includes(expectedUrl))) {
        lastScene.textOverlay = expectedUrl;
      }
    };

    enforceCTAOverlay(data.teaser30s.scenes);
    enforceCTAOverlay(data.explainer60s.scenes);

    const metadata: AssetMetadata = {
      generatedAt: new Date().toISOString(),
      model: resolvedModel,
      tokensUsed: raw.length,
      durationMs: Date.now() - start,
      version: 1,
    };

    return {
      type: 'videoScript',
      status: 'done',
      data,
      metadata,
    };
  } catch (err) {
    return {
      type: 'videoScript',
      status: 'error',
      data: null,
      metadata: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
