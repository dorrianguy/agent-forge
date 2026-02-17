import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

export async function POST(request: NextRequest) {
  try {
    const { name, type, description } = await request.json();

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Agent description is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const userPrompt = `Create an AI agent with these specifications:

Name: ${name || 'My Agent'}
Type: ${type || 'custom'}
Description: ${description}

Generate a complete agent configuration based on this description.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    let agentConfig;
    try {
      agentConfig = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        agentConfig = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse agent configuration');
      }
    }

    const agent = {
      id: `agent-${Date.now()}`,
      name: agentConfig.name || name,
      type: agentConfig.type || type || 'custom',
      description,
      config: agentConfig,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error('Agent generation error:', error);

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'AI service authentication failed' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate agent' },
      { status: 500 }
    );
  }
}
