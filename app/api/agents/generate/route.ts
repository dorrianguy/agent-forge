import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { escalatingCall, ESCALATION_PRESETS } from '@/lib/model-escalation';
import { GeneratedAgentConfigSchema, zodToToolSchema, formatZodErrors } from '@/lib/schemas';
import { logger } from '@/lib/logger';

// 3 requests per IP per hour
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const SYSTEM_PROMPT = `You are an expert AI agent architect for Agent Forge. Given a user's description of what kind of AI agent they need, generate a complete agent configuration by calling the generate_agent_config tool.`;

/**
 * Claude tool definition derived from the Zod schema.
 * The LLM returns structured data via tool_use — no JSON parsing/regex needed.
 */
const GENERATE_AGENT_TOOL: Anthropic.Tool = {
  name: 'generate_agent_config',
  description:
    'Generate a complete AI agent configuration including personality, system prompt, greeting, widget config, and more.',
  input_schema: zodToToolSchema(GeneratedAgentConfigSchema) as Anthropic.Tool.InputSchema,
};

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

Generate a complete agent configuration by calling the generate_agent_config tool.`;

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

    if (!agentConfig) {
      return NextResponse.json(
        { error: 'Failed to generate agent configuration after multiple attempts' },
        { status: 500 },
      );
    }

    const config = agentConfig as Record<string, unknown>;
    const agent = {
      id: `agent-${Date.now()}`,
      name: (config.name as string) || name,
      type: (config.type as string) || type || 'custom',
      description,
      config,
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
