// Test Console Types

export interface TestMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  tokens?: TokenUsage;
  latencyMs?: number;
  costEstimate?: number;
  toolCalls?: ToolCall[];
  knowledgeChunks?: KnowledgeChunk[];
  model?: string;
  finishReason?: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  durationMs?: number;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  score: number;
  source?: string;
}

export interface DebugInfo {
  systemPrompt: string;
  request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
    tools?: any[];
  };
  response: {
    id?: string;
    model?: string;
    content: string;
    finishReason?: string;
    usage?: TokenUsage;
  };
  tokens: TokenUsage;
  latencyMs: number;
  costEstimate: number;
  toolCalls: ToolCall[];
  knowledgeChunks: KnowledgeChunk[];
}

export interface TestSession {
  id: string;
  agentId: string;
  agentName: string;
  agentVersion?: string;
  messages: TestMessage[];
  debugHistory: DebugInfo[];
  createdAt: Date;
  updatedAt: Date;
  totalTokens: number;
  totalCost: number;
  messageCount: number;
}

export type DeviceView = 'desktop' | 'mobile' | 'widget';

export interface DeviceFrame {
  type: DeviceView;
  width: number;
  height: number;
  label: string;
}

export const DEVICE_FRAMES: Record<DeviceView, DeviceFrame> = {
  desktop: {
    type: 'desktop',
    width: 800,
    height: 600,
    label: 'Desktop',
  },
  mobile: {
    type: 'mobile',
    width: 375,
    height: 667,
    label: 'Mobile (iPhone SE)',
  },
  widget: {
    type: 'widget',
    width: 380,
    height: 520,
    label: 'Chat Widget',
  },
};

// Cost estimates per 1000 tokens (USD)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
};

export function calculateCost(tokens: TokenUsage, model: string): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['gpt-4o-mini'];
  return (tokens.input / 1000) * costs.input + (tokens.output / 1000) * costs.output;
}

export function generateSessionId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
