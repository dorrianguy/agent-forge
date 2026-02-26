import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { escalatingCall, ESCALATION_PRESETS } from '@/lib/model-escalation';
import { logger } from '@/lib/logger';

// 3 requests per IP per hour
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const SYSTEM_PROMPT = `You are an expert AI agent architect for Agent Forge. Given a user's description of what kind of AI agent they need, generate a complete agent configuration.

Return a JSON object with this exact structure:
{
  "name": "<agent name from user input>",
  "type": "<support|sales|lead|custom>",
  "personality": {
    "tone": "<professional|friendly|casual|formal>",
    "style": "<concise|detailed|conversational>",
    "traits": ["<trait1>", "<trait2>", "<trait3>"]
  },
  "systemPrompt": "<A complete system prompt for this agent, 2-4 paragraphs, that defines its role, capabilities, boundaries, and conversation style>",
  "greeting": "<The first message the agent sends when a user starts a conversation>",
  "fallbackMessage": "<What the agent says when it can't answer a question>",
  "escalationTriggers": ["<phrase or condition that should trigger human handoff>"],
  "knowledgeTopics": ["<topic1>", "<topic2>", "<topic3>"],
  "suggestedQuestions": ["<question visitors might ask>", "<another question>", "<another>"],
  "widgetConfig": {
    "position": "bottom-right",
    "primaryColor": "#f97316",
    "chatTitle": "<title for the chat widget>"
  }
}

Only return valid JSON. No markdown, no explanation, just the JSON object.`;

// Zod schema for the generated agent config — used for model escalation validation
const GeneratedAgentConfigSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  personality: z.object({
    tone: z.string(),
    style: z.string(),
    traits: z.array(z.string()),
  }),
  systemPrompt: z.string().min(10),
  greeting: z.string().min(1),
  fallbackMessage: z.string().min(1),
  escalationTriggers: z.array(z.string()),
  knowledgeTopics: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
  widgetConfig: z.object({
    position: z.string(),
    primaryColor: z.string(),
    chatTitle: z.string(),
  }),
});

type GeneratedAgentConfig = z.infer<typeof GeneratedAgentConfigSchema>;

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const { allowed, remaining, resetAt } = checkRateLimit(
    `generate:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW,
  );

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  try {
    const { name, type, description } = await request.json();

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Agent description is required' },
        { status: 400 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 },
      );
    }

    const userPrompt = `Create an AI agent with these specifications:

Name: ${name || 'My Agent'}
Type: ${type || 'custom'}
Description: ${description}

Generate a complete agent configuration based on this description.`;

    // Use model escalation: start cheap, escalate on validation failure
    const escalationModels = process.env.ANTHROPIC_API_KEY
      ? [...ESCALATION_PRESETS.anthropic_balanced]
      : [...ESCALATION_PRESETS.balanced];

    let agentConfig: GeneratedAgentConfig;
    let usedModel: string;
    let attempts: number;
    let costSaved: number;

    try {
      const escalationResult = await escalatingCall(
        GeneratedAgentConfigSchema,
        userPrompt,
        {
          models: escalationModels,
          systemPrompt: SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 2048,
        },
      );

      agentConfig = escalationResult.result;
      usedModel = escalationResult.model;
      attempts = escalationResult.attempts;
      costSaved = escalationResult.costSaved;

      logger.info('Agent generated via escalation', {
        model: usedModel,
        attempts,
        costSaved: costSaved.toFixed(6),
      });
    } catch {
      // Fallback: direct Anthropic call if escalation fails entirely
      logger.info('Escalation exhausted, falling back to direct Anthropic call');

      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: 'AI service not available' },
          { status: 503 },
        );
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{ role: 'user', content: userPrompt }],
        system: SYSTEM_PROMPT,
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format');
      }

      let parsed;
      try {
        parsed = JSON.parse(content.text);
      } catch {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse agent configuration');
        }
      }

      agentConfig = parsed;
      usedModel = 'claude-sonnet-4-5-20250929';
      attempts = 1;
      costSaved = 0;
    }

    const agent = {
      id: `agent-${Date.now()}`,
      name: agentConfig.name || name,
      type: agentConfig.type || type || 'custom',
      description,
      config: agentConfig,
      status: 'ready',
      createdAt: new Date().toISOString(),
      _meta: {
        generatedBy: usedModel,
        escalationAttempts: attempts,
        costSaved: costSaved,
      },
    };

    return NextResponse.json({ agent });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Agent generation error', err);

    if ('status' in err && (err as { status: number }).status === 401) {
      return NextResponse.json(
        { error: 'AI service authentication failed' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to generate agent' },
      { status: 500 },
    );
  }
}
