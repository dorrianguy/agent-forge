import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { ToolRegistry, createRegistryFromDefinitions } from '@/lib/tool-registry';
import { partitionTools, isToolSearchCall, handleToolSearchCall } from '@/lib/tool-search';
import { ToolDefinitionSchema } from '@/lib/schemas/tool';
import type { ToolDefinition, ToolSearchConfig } from '@/lib/schemas/tool';
import type { DebugInfo, TokenUsage, ToolCall, KnowledgeChunk } from '@/lib/test-types';
import { calculateCost } from '@/lib/test-types';

// Lazy-load clients to avoid build-time errors
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// ============================================================
// Tool helpers
// ============================================================

/**
 * Load and validate tool definitions from agent config.
 */
function loadToolDefinitions(config: Record<string, unknown>): ToolDefinition[] {
  const rawTools = config.tools;
  if (!Array.isArray(rawTools) || rawTools.length === 0) return [];

  const validated: ToolDefinition[] = [];
  for (const raw of rawTools) {
    const result = ToolDefinitionSchema.safeParse(raw);
    if (result.success) {
      validated.push(result.data);
    }
  }
  return validated;
}

/**
 * Build a registry from definitions and attach tool examples from agent config.
 */
function buildRegistry(
  definitions: ToolDefinition[],
  toolExamples: Record<string, Array<{ input: Record<string, unknown>; output?: unknown; description?: string }>>,
): ToolRegistry {
  // Merge examples into definitions
  const enriched = definitions.map((def) => {
    const examples = toolExamples[def.name];
    if (examples && examples.length > 0) {
      return { ...def, inputExamples: examples.slice(0, 5) };
    }
    return def;
  });

  return createRegistryFromDefinitions(enriched);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { agentId, messages, stream = false } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 },
      );
    }

    // Get agent config from database
    const supabase = createServerSupabaseClient();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 },
      );
    }

    // Build system prompt from agent config
    const config = (agent.config || {}) as Record<string, unknown>;
    const systemPrompt = buildSystemPrompt(agent, config);

    // Determine model to use
    const model = (config.model as string) || 'gpt-4o-mini';
    const isAnthropic = model.startsWith('claude');

    // Load tools and build registry
    const toolDefinitions = loadToolDefinitions(config);
    const toolExamples = ((agent.tool_examples as Record<string, unknown[]>) || {}) as Record<
      string,
      Array<{ input: Record<string, unknown>; output?: unknown; description?: string }>
    >;
    const registry = buildRegistry(toolDefinitions, toolExamples);

    // Partition tools if there are enough for deferred loading
    const toolSearchConfig: Partial<ToolSearchConfig> = {
      autoEnable: true,
      autoEnableThreshold: 10,
    };
    const { immediate: immediateDefinitions, deferred: deferredDefinitions, toolSearchIncluded } =
      partitionTools(toolDefinitions, toolSearchConfig);

    // Convert immediate tools to provider format
    const immediateRegistry = createRegistryFromDefinitions(immediateDefinitions);
    const providerTools = isAnthropic
      ? immediateRegistry.toAnthropicTools()
      : immediateRegistry.toOpenAITools();

    // Track deferred tools state for this conversation turn
    let activeDeferredTools = deferredDefinitions;
    const dynamicallyInjectedTools: ToolDefinition[] = [];

    // Prepare messages for API
    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Add tool search context to system prompt if active
    let enhancedSystemPrompt = systemPrompt;
    if (toolSearchIncluded) {
      enhancedSystemPrompt +=
        '\n\nNote: Some tools are not listed yet. If you need a capability not shown above, ' +
        'use the tool_search tool to find additional tools by describing what you need.';
    }

    // Build request payload
    const requestPayload: Record<string, unknown> = {
      model,
      messages: isAnthropic
        ? apiMessages.filter((m) => m.role !== 'system')
        : apiMessages,
      temperature: (config.temperature as number) || 0.7,
      max_tokens: (config.maxTokens as number) || 1024,
    };

    if (isAnthropic) {
      requestPayload.system = enhancedSystemPrompt;
    } else if (enhancedSystemPrompt !== systemPrompt) {
      // Update system message for OpenAI
      const msgs = requestPayload.messages as Array<{ role: string; content: string }>;
      if (msgs[0]?.role === 'system') {
        msgs[0].content = enhancedSystemPrompt;
      }
    }

    if (providerTools.length > 0) {
      requestPayload.tools = providerTools;
    }

    let content = '';
    let tokens: TokenUsage = { input: 0, output: 0, total: 0 };
    let toolCalls: ToolCall[] = [];
    let finishReason = '';

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();

      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            if (isAnthropic) {
              const anthropicStream = await getAnthropicClient().messages.stream({
                model,
                system: enhancedSystemPrompt,
                messages: apiMessages
                  .filter((m) => m.role !== 'system')
                  .map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                  })),
                max_tokens: (config.maxTokens as number) || 1024,
                ...(providerTools.length > 0
                  ? { tools: providerTools as Anthropic.Messages.Tool[] }
                  : {}),
              });

              for await (const event of anthropicStream) {
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  content += event.delta.text;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: event.delta.text })}\n\n`,
                    ),
                  );
                }
              }

              const finalMessage = await anthropicStream.finalMessage();
              tokens = {
                input: finalMessage.usage.input_tokens,
                output: finalMessage.usage.output_tokens,
                total:
                  finalMessage.usage.input_tokens +
                  finalMessage.usage.output_tokens,
              };
              finishReason = finalMessage.stop_reason || 'stop';
            } else {
              const openaiStream = await getOpenAIClient().chat.completions.create({
                ...(requestPayload as OpenAI.ChatCompletionCreateParamsStreaming),
                stream: true,
              });

              for await (const chunk of openaiStream) {
                const delta = chunk.choices[0]?.delta?.content || '';
                if (delta) {
                  content += delta;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: delta })}\n\n`,
                    ),
                  );
                }
                if (chunk.choices[0]?.finish_reason) {
                  finishReason = chunk.choices[0].finish_reason;
                }
              }

              tokens = {
                input: estimateTokens(
                  apiMessages.map((m) => m.content).join(' '),
                ),
                output: estimateTokens(content),
                total: 0,
              };
              tokens.total = tokens.input + tokens.output;
            }

            const latencyMs = Date.now() - startTime;
            const debugInfo: DebugInfo = {
              systemPrompt: enhancedSystemPrompt,
              request: requestPayload as DebugInfo['request'],
              response: { model, content, finishReason, usage: tokens },
              tokens,
              latencyMs,
              costEstimate: calculateCost(tokens, model),
              toolCalls,
              knowledgeChunks: [],
            };

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, debugInfo })}\n\n`,
              ),
            );
            controller.close();
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`,
              ),
            );
            controller.close();
          }
        },
      });

      return new Response(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming response
    let response: unknown;

    if (isAnthropic) {
      const anthropicResponse = await getAnthropicClient().messages.create({
        model,
        system: enhancedSystemPrompt,
        messages: apiMessages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        max_tokens: (config.maxTokens as number) || 1024,
        ...(providerTools.length > 0
          ? { tools: providerTools as Anthropic.Messages.Tool[] }
          : {}),
      });

      response = anthropicResponse;

      // Handle tool use blocks (including tool_search)
      for (const block of anthropicResponse.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          const args = block.input as Record<string, unknown>;
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: args,
          });

          // Handle tool_search meta-tool
          if (isToolSearchCall(block.name) && activeDeferredTools.length > 0) {
            const query = (args.query as string) || '';
            const searchResult = handleToolSearchCall(
              query,
              activeDeferredTools,
              toolSearchConfig,
            );

            dynamicallyInjectedTools.push(...searchResult.matchedTools);

            // Remove found tools from deferred pool
            const foundNames = new Set(
              searchResult.matchedTools.map((t) => t.name),
            );
            activeDeferredTools = activeDeferredTools.filter(
              (t) => !foundNames.has(t.name),
            );

            logger.info('Tool search executed', {
              query,
              found: searchResult.matchedTools.length,
              remaining: activeDeferredTools.length,
            });
          }
        }
      }

      tokens = {
        input: anthropicResponse.usage.input_tokens,
        output: anthropicResponse.usage.output_tokens,
        total:
          anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens,
      };
      finishReason = anthropicResponse.stop_reason || 'stop';
    } else {
      const openaiResponse =
        await getOpenAIClient().chat.completions.create(
          requestPayload as OpenAI.ChatCompletionCreateParamsNonStreaming,
        );

      response = openaiResponse;
      content = openaiResponse.choices[0]?.message?.content || '';
      tokens = {
        input: openaiResponse.usage?.prompt_tokens || 0,
        output: openaiResponse.usage?.completion_tokens || 0,
        total: openaiResponse.usage?.total_tokens || 0,
      };
      finishReason = openaiResponse.choices[0]?.finish_reason || 'stop';

      // Handle tool calls (including tool_search)
      if (openaiResponse.choices[0]?.message?.tool_calls) {
        for (const tc of openaiResponse.choices[0].message.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: args,
          });

          // Handle tool_search meta-tool
          if (
            isToolSearchCall(tc.function.name) &&
            activeDeferredTools.length > 0
          ) {
            const query = (args.query as string) || '';
            const searchResult = handleToolSearchCall(
              query,
              activeDeferredTools,
              toolSearchConfig,
            );

            dynamicallyInjectedTools.push(...searchResult.matchedTools);

            const foundNames = new Set(
              searchResult.matchedTools.map((t) => t.name),
            );
            activeDeferredTools = activeDeferredTools.filter(
              (t) => !foundNames.has(t.name),
            );

            logger.info('Tool search executed', {
              query,
              found: searchResult.matchedTools.length,
              remaining: activeDeferredTools.length,
            });
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    const debugInfo: DebugInfo = {
      systemPrompt: enhancedSystemPrompt,
      request: requestPayload as DebugInfo['request'],
      response: {
        id: (response as { id?: string })?.id,
        model,
        content,
        finishReason,
        usage: tokens,
      },
      tokens,
      latencyMs,
      costEstimate: calculateCost(tokens, model),
      toolCalls,
      knowledgeChunks: [],
    };

    // Include tool search metadata in response
    const responseBody: Record<string, unknown> = {
      content,
      debugInfo,
    };

    if (dynamicallyInjectedTools.length > 0) {
      responseBody.injectedTools = dynamicallyInjectedTools.map((t) => ({
        name: t.name,
        description: t.description,
      }));
    }

    if (toolSearchIncluded) {
      responseBody.toolSearchActive = true;
      responseBody.toolStats = {
        immediate: immediateDefinitions.length,
        deferred: deferredDefinitions.length,
        dynamicallyInjected: dynamicallyInjectedTools.length,
      };
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    logger.error('Test chat error', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 },
    );
  }
}

function buildSystemPrompt(
  agent: Record<string, unknown>,
  config: Record<string, unknown>,
): string {
  let prompt =
    (config.systemPrompt as string) ||
    `You are ${agent.name}, a helpful AI assistant.`;

  if (config.personality) {
    prompt += `\n\nPersonality: ${config.personality}`;
  }

  if (config.instructions) {
    prompt += `\n\nInstructions:\n${config.instructions}`;
  }

  if (
    Array.isArray(config.knowledgeBase) &&
    config.knowledgeBase.length > 0
  ) {
    prompt += '\n\nRelevant knowledge:\n';
    for (const kb of config.knowledgeBase as Array<{
      title: string;
      content: string;
    }>) {
      prompt += `- ${kb.title}: ${kb.content}\n`;
    }
  }

  if (config.responseFormat) {
    prompt += `\n\nResponse format: ${config.responseFormat}`;
  }

  return prompt;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
