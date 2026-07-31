import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';
import { escalatingCall, ESCALATION_PRESETS } from '@/lib/model-escalation';
import { GeneratedAgentConfigSchema, zodToToolSchema, formatZodErrors } from '@/lib/schemas';
import { logger } from '@/lib/logger';
import { detectInjection, scanAndRedactPii, detectLeakage, validateInputLengths } from '@/lib/llm-security';
import { AGENT_ACTION_ALLOWLISTS, type AgentType } from '@/lib/schemas';

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
  const rateLimitResult = checkRateLimit(`generate:${ip}`, {
    maxRequests: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW,
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) },
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

    // Input length validation — prevents token-flooding attacks
    const lengthError = validateInputLengths({ name, description });
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 });
    }

    // Prompt injection detection — block before anything reaches the LLM
    const injectionInName = name ? detectInjection(name) : null;
    const injectionInDescription = detectInjection(description);
    if (injectionInName || injectionInDescription) {
      logger.warn('Prompt injection attempt blocked in agent generate', { ip, injectionInName, injectionInDescription });
      return NextResponse.json(
        { error: 'Invalid input detected' },
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

      agentConfig = escalationResult.result as GeneratedAgentConfig;
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

    // Output safety: scan LLM-generated text fields for PII and leakage
    const systemPromptText = (config.systemPrompt as string) ?? '';
    const greetingText = (config.greeting as string) ?? '';

    const leakageCheck = detectLeakage(systemPromptText) ?? detectLeakage(greetingText);
    if (leakageCheck) {
      logger.warn('System prompt leakage detected in agent generation output', { ip, leakageCheck });
      return NextResponse.json(
        { error: 'Generated configuration could not be validated. Please try again.' },
        { status: 500 },
      );
    }

    const systemPromptScan = scanAndRedactPii(systemPromptText);
    const greetingScan = scanAndRedactPii(greetingText);
    if (!systemPromptScan.clean) {
      logger.warn('PII found in generated system prompt — redacted', { ip, findings: systemPromptScan.findings });
      config.systemPrompt = systemPromptScan.redacted;
    }
    if (!greetingScan.clean) {
      logger.warn('PII found in generated greeting — redacted', { ip, findings: greetingScan.findings });
      config.greeting = greetingScan.redacted;
    }

    const agentType = ((config.type as string) || type || 'custom') as AgentType;
    const agent = {
      id: `agent-${Date.now()}`,
      name: (config.name as string) || name,
      type: agentType,
      description,
      config,
      status: 'ready',
      allowedActions: AGENT_ACTION_ALLOWLISTS[agentType] ?? AGENT_ACTION_ALLOWLISTS.custom,
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
