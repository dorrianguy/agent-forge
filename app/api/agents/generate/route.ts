import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/rate-limit';
import { GeneratedAgentConfigSchema, zodToToolSchema, formatZodErrors } from '@/lib/schemas';
import {
  createEscalationContext,
  recordFailureAndEscalate,
  type EscalationContext,
} from '@/lib/model-escalation';
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

const MAX_ESCALATION_ATTEMPTS = 3;

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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 },
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const userPrompt = `Create an AI agent with these specifications:

Name: ${name || 'My Agent'}
Type: ${type || 'custom'}
Description: ${description}

Generate a complete agent configuration by calling the generate_agent_config tool.`;

    // Model escalation: start cheap, escalate on failures
    const ctx = createEscalationContext('anthropic', 0.10);
    let agentConfig: unknown = null;
    let attempts = 0;

    while (!agentConfig && attempts < MAX_ESCALATION_ATTEMPTS) {
      attempts += 1;

      try {
        const message = await anthropic.messages.create({
          model: ctx.currentModel,
          max_tokens: 2048,
          tools: [GENERATE_AGENT_TOOL],
          tool_choice: { type: 'tool', name: 'generate_agent_config' },
          messages: [{ role: 'user', content: userPrompt }],
          system: SYSTEM_PROMPT,
        });

        // Extract tool_use block
        const toolUseBlock = message.content.find(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );

        if (!toolUseBlock) {
          const { escalated } = recordFailureAndEscalate(ctx, 'empty_response');
          logger.warn('No tool_use block in response', {
            model: ctx.currentModel,
            escalated,
            attempt: attempts,
          });
          continue;
        }

        // Validate with Zod
        const parsed = GeneratedAgentConfigSchema.safeParse(toolUseBlock.input);
        if (!parsed.success) {
          const { escalated } = recordFailureAndEscalate(ctx, 'tool_schema_error');
          logger.warn('Tool output failed Zod validation', {
            model: ctx.currentModel,
            escalated,
            attempt: attempts,
            errors: parsed.error.issues.map((i) => i.message),
          });
          continue;
        }

        agentConfig = parsed.data;
      } catch (apiError: any) {
        if (apiError?.status === 401) {
          return NextResponse.json(
            { error: 'AI service authentication failed' },
            { status: 503 },
          );
        }

        const { escalated } = recordFailureAndEscalate(ctx, 'json_parse_error');
        logger.error('API call failed, escalating', {
          model: ctx.currentModel,
          escalated,
          attempt: attempts,
          error: apiError?.message,
        });
      }
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
      model: ctx.currentModel,
      attempts,
    };

    return NextResponse.json({ agent });
  } catch (error: any) {
    logger.error('Agent generation error', error);

    return NextResponse.json(
      { error: error.message || 'Failed to generate agent' },
      { status: 500 },
    );
  }
}
