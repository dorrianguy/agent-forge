import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { DebugInfo, TokenUsage, ToolCall, KnowledgeChunk } from '@/lib/test-types';
import { calculateCost } from '@/lib/test-types';

// Initialize clients (they'll be used based on agent config)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { agentId, messages, stream = false } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
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
        { status: 404 }
      );
    }

    // Build system prompt from agent config
    const config = agent.config || {};
    const systemPrompt = buildSystemPrompt(agent, config);
    
    // Determine model to use
    const model = config.model || 'gpt-4o-mini';
    const isAnthropic = model.startsWith('claude');
    
    // Prepare messages for API
    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Prepare tools if configured
    const tools = config.tools || [];

    // Build request payload
    const requestPayload: any = {
      model,
      messages: isAnthropic 
        ? apiMessages.filter(m => m.role !== 'system') 
        : apiMessages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1024,
    };

    if (isAnthropic) {
      requestPayload.system = systemPrompt;
    }

    if (tools.length > 0 && !isAnthropic) {
      requestPayload.tools = tools;
    }

    let response: any;
    let content = '';
    let tokens: TokenUsage = { input: 0, output: 0, total: 0 };
    let toolCalls: ToolCall[] = [];
    let finishReason = '';

    // Handle streaming vs non-streaming
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            if (isAnthropic) {
              // Anthropic streaming
              const stream = await anthropic.messages.stream({
                model,
                system: systemPrompt,
                messages: apiMessages.filter(m => m.role !== 'system').map(m => ({
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                })),
                max_tokens: config.maxTokens || 1024,
              });

              for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  content += event.delta.text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`)
                  );
                }
              }

              const finalMessage = await stream.finalMessage();
              tokens = {
                input: finalMessage.usage.input_tokens,
                output: finalMessage.usage.output_tokens,
                total: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
              };
              finishReason = finalMessage.stop_reason || 'stop';
            } else {
              // OpenAI streaming
              const stream = await openai.chat.completions.create({
                ...requestPayload,
                stream: true,
              } as OpenAI.ChatCompletionCreateParamsStreaming);

              for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || '';
                if (delta) {
                  content += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                  );
                }
                if (chunk.choices[0]?.finish_reason) {
                  finishReason = chunk.choices[0].finish_reason;
                }
              }

              // Estimate tokens for streaming (OpenAI doesn't provide exact counts)
              tokens = {
                input: estimateTokens(apiMessages.map(m => m.content).join(' ')),
                output: estimateTokens(content),
                total: 0,
              };
              tokens.total = tokens.input + tokens.output;
            }

            // Send final debug info
            const latencyMs = Date.now() - startTime;
            const debugInfo: DebugInfo = {
              systemPrompt,
              request: requestPayload,
              response: {
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

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, debugInfo })}\n\n`)
            );
            controller.close();
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
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
    } else {
      // Non-streaming response
      if (isAnthropic) {
        response = await anthropic.messages.create({
          model,
          system: systemPrompt,
          messages: apiMessages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          max_tokens: config.maxTokens || 1024,
        });

        content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        tokens = {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        };
        finishReason = response.stop_reason || 'stop';
      } else {
        response = await openai.chat.completions.create(requestPayload);

        content = response.choices[0]?.message?.content || '';
        tokens = {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        };
        finishReason = response.choices[0]?.finish_reason || 'stop';

        // Handle tool calls if present
        if (response.choices[0]?.message?.tool_calls) {
          toolCalls = response.choices[0].message.tool_calls.map((tc: any) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}'),
          }));
        }
      }

      const latencyMs = Date.now() - startTime;
      const debugInfo: DebugInfo = {
        systemPrompt,
        request: requestPayload,
        response: {
          id: response.id,
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

      return NextResponse.json({
        content,
        debugInfo,
      });
    }
  } catch (error) {
    console.error('Test chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(agent: any, config: any): string {
  let prompt = config.systemPrompt || `You are ${agent.name}, a helpful AI assistant.`;

  // Add personality traits
  if (config.personality) {
    prompt += `\n\nPersonality: ${config.personality}`;
  }

  // Add instructions
  if (config.instructions) {
    prompt += `\n\nInstructions:\n${config.instructions}`;
  }

  // Add knowledge context
  if (config.knowledgeBase && config.knowledgeBase.length > 0) {
    prompt += '\n\nRelevant knowledge:\n';
    config.knowledgeBase.forEach((kb: any) => {
      prompt += `- ${kb.title}: ${kb.content}\n`;
    });
  }

  // Add response format guidelines
  if (config.responseFormat) {
    prompt += `\n\nResponse format: ${config.responseFormat}`;
  }

  return prompt;
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
