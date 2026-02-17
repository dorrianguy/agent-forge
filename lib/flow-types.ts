// Flow Builder TypeScript Types

export type NodeType =
  | 'start'
  | 'message'
  | 'userInput'
  | 'condition'
  | 'aiResponse'
  | 'apiCall'
  | 'setVariable'
  | 'handoff'
  | 'end';

// Base node data interface
export interface BaseNodeData {
  label: string;
  description?: string;
}

// Start Node - Entry point
export interface StartNodeData extends BaseNodeData {
  type: 'start';
  triggerType: 'greeting' | 'keyword' | 'intent' | 'webhook';
  triggerValue?: string;
}

// Message Node - Bot sends a message
export interface MessageNodeData extends BaseNodeData {
  type: 'message';
  content: string;
  delay?: number; // milliseconds
  typing?: boolean; // show typing indicator
  buttons?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  quickReplies?: string[];
}

// User Input Node - Wait for user response
export interface UserInputNodeData extends BaseNodeData {
  type: 'userInput';
  inputType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'choice' | 'file';
  variableName: string;
  prompt?: string;
  validation?: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    errorMessage?: string;
  };
  choices?: string[];
  timeout?: number; // seconds
  timeoutAction?: 'repeat' | 'skip' | 'end';
}

// Condition Node - If/else branching
export interface ConditionNodeData extends BaseNodeData {
  type: 'condition';
  conditions: Array<{
    id: string;
    variable: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty' | 'matches';
    value: string;
    outputHandle: string;
  }>;
  defaultOutputHandle: string;
}

// AI Response Node - LLM generates response
export interface AIResponseNodeData extends BaseNodeData {
  type: 'aiResponse';
  prompt: string;
  systemPrompt?: string;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-instant';
  temperature?: number;
  maxTokens?: number;
  saveToVariable?: string;
  contextVariables?: string[];
}

// API Call Node - Call external API
export interface APICallNodeData extends BaseNodeData {
  type: 'apiCall';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  bodyType?: 'json' | 'form' | 'raw';
  responseVariable?: string;
  timeout?: number;
  retries?: number;
  onError?: 'continue' | 'stop' | 'retry';
}

// Set Variable Node - Store data
export interface SetVariableNodeData extends BaseNodeData {
  type: 'setVariable';
  variables: Array<{
    name: string;
    value: string;
    valueType: 'static' | 'expression' | 'fromVariable';
  }>;
}

// Handoff Node - Transfer to human
export interface HandoffNodeData extends BaseNodeData {
  type: 'handoff';
  reason?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  department?: string;
  message?: string;
  collectInfo?: string[];
  workingHours?: {
    enabled: boolean;
    timezone?: string;
    schedule?: Record<string, { start: string; end: string }>;
    offlineMessage?: string;
  };
}

// End Node - Conversation ends
export interface EndNodeData extends BaseNodeData {
  type: 'end';
  endType: 'complete' | 'cancelled' | 'error' | 'timeout';
  finalMessage?: string;
  collectFeedback?: boolean;
  redirectUrl?: string;
}

// Union type for all node data
export type FlowNodeData =
  | StartNodeData
  | MessageNodeData
  | UserInputNodeData
  | ConditionNodeData
  | AIResponseNodeData
  | APICallNodeData
  | SetVariableNodeData
  | HandoffNodeData
  | EndNodeData;

// Flow node with position
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
  selected?: boolean;
  dragging?: boolean;
}

// Flow edge/connection
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, string | number>;
}

// Complete flow definition
export interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: FlowVariable[];
  settings: FlowSettings;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// Flow variable definition
export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: string | number | boolean | unknown[] | Record<string, unknown>;
  description?: string;
  scope: 'conversation' | 'user' | 'global';
}

// Flow settings
export interface FlowSettings {
  startNodeId?: string;
  defaultTimeout?: number;
  fallbackMessage?: string;
  errorMessage?: string;
  maxRetries?: number;
  analytics?: {
    enabled: boolean;
    trackEvents?: string[];
  };
}

// History state for undo/redo
export interface HistoryState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  timestamp: number;
}

// Node configuration for the sidebar
export interface NodeConfig {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Partial<FlowNodeData>;
}

// Export/Import format
export interface FlowExport {
  version: string;
  exportedAt: string;
  flow: Flow;
}
