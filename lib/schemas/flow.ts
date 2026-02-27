/**
 * Zod schemas for the Flow Builder — nodes, edges, variables, and the
 * complete Flow definition.
 *
 * Derived from the TypeScript types in lib/flow-types.ts so they stay in
 * sync while adding runtime validation.
 */

import { z } from 'zod';

// ============================================================
// Node type enum
// ============================================================

export const NodeTypeSchema = z.enum([
  'start',
  'message',
  'userInput',
  'condition',
  'aiResponse',
  'apiCall',
  'setVariable',
  'handoff',
  'end',
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

// ============================================================
// Individual node data schemas
// ============================================================

const BaseNodeDataSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
});

export const StartNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('start'),
  triggerType: z.enum(['greeting', 'keyword', 'intent', 'webhook']),
  triggerValue: z.string().optional(),
});

export const ButtonSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const MessageNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('message'),
  content: z.string(),
  delay: z.number().int().min(0).optional(),
  typing: z.boolean().optional(),
  buttons: z.array(ButtonSchema).optional(),
  quickReplies: z.array(z.string()).optional(),
});

export const UserInputValidationSchema = z.object({
  required: z.boolean().optional(),
  pattern: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  errorMessage: z.string().optional(),
});

export const UserInputNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('userInput'),
  inputType: z.enum([
    'text',
    'email',
    'phone',
    'number',
    'date',
    'choice',
    'file',
  ]),
  variableName: z.string().min(1),
  prompt: z.string().optional(),
  validation: UserInputValidationSchema.optional(),
  choices: z.array(z.string()).optional(),
  timeout: z.number().int().min(0).optional(),
  timeoutAction: z.enum(['repeat', 'skip', 'end']).optional(),
});

export const ConditionItemSchema = z.object({
  id: z.string(),
  variable: z.string(),
  operator: z.enum([
    'equals',
    'notEquals',
    'contains',
    'notContains',
    'greaterThan',
    'lessThan',
    'isEmpty',
    'isNotEmpty',
    'matches',
  ]),
  value: z.string(),
  outputHandle: z.string(),
});

export const ConditionNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('condition'),
  conditions: z.array(ConditionItemSchema),
  defaultOutputHandle: z.string(),
});

export const AIResponseNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('aiResponse'),
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  model: z
    .enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-instant'])
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
  saveToVariable: z.string().optional(),
  contextVariables: z.array(z.string()).optional(),
});

export const APICallNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('apiCall'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  bodyType: z.enum(['json', 'form', 'raw']).optional(),
  responseVariable: z.string().optional(),
  timeout: z.number().int().min(0).optional(),
  retries: z.number().int().min(0).optional(),
  onError: z.enum(['continue', 'stop', 'retry']).optional(),
});

export const SetVariableItemSchema = z.object({
  name: z.string(),
  value: z.string(),
  valueType: z.enum(['static', 'expression', 'fromVariable']),
});

export const SetVariableNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('setVariable'),
  variables: z.array(SetVariableItemSchema),
});

const WorkingHoursSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().optional(),
  schedule: z
    .record(z.object({ start: z.string(), end: z.string() }))
    .optional(),
  offlineMessage: z.string().optional(),
});

export const HandoffNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('handoff'),
  reason: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  department: z.string().optional(),
  message: z.string().optional(),
  collectInfo: z.array(z.string()).optional(),
  workingHours: WorkingHoursSchema.optional(),
});

export const EndNodeDataSchema = BaseNodeDataSchema.extend({
  type: z.literal('end'),
  endType: z.enum(['complete', 'cancelled', 'error', 'timeout']),
  finalMessage: z.string().optional(),
  collectFeedback: z.boolean().optional(),
  redirectUrl: z.string().optional(),
});

export const FlowNodeDataSchema = z.discriminatedUnion('type', [
  StartNodeDataSchema,
  MessageNodeDataSchema,
  UserInputNodeDataSchema,
  ConditionNodeDataSchema,
  AIResponseNodeDataSchema,
  APICallNodeDataSchema,
  SetVariableNodeDataSchema,
  HandoffNodeDataSchema,
  EndNodeDataSchema,
]);

export type FlowNodeData = z.infer<typeof FlowNodeDataSchema>;

// ============================================================
// Flow node (with position)
// ============================================================

export const FlowNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  data: FlowNodeDataSchema,
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
});

export type FlowNode = z.infer<typeof FlowNodeSchema>;

// ============================================================
// Flow edge
// ============================================================

export const FlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  animated: z.boolean().optional(),
  style: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type FlowEdge = z.infer<typeof FlowEdgeSchema>;

// ============================================================
// Flow variable
// ============================================================

export const FlowVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
  scope: z.enum(['conversation', 'user', 'global']),
});

export type FlowVariable = z.infer<typeof FlowVariableSchema>;

// ============================================================
// Flow settings
// ============================================================

export const FlowSettingsSchema = z.object({
  startNodeId: z.string().optional(),
  defaultTimeout: z.number().int().min(0).optional(),
  fallbackMessage: z.string().optional(),
  errorMessage: z.string().optional(),
  maxRetries: z.number().int().min(0).optional(),
  analytics: z
    .object({
      enabled: z.boolean(),
      trackEvents: z.array(z.string()).optional(),
    })
    .optional(),
});

export type FlowSettings = z.infer<typeof FlowSettingsSchema>;

// ============================================================
// Complete flow
// ============================================================

export const FlowSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
  variables: z.array(FlowVariableSchema),
  settings: FlowSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().min(0),
});

export type Flow = z.infer<typeof FlowSchema>;

// ============================================================
// Flow export / import
// ============================================================

export const FlowExportSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  flow: FlowSchema,
});

export type FlowExport = z.infer<typeof FlowExportSchema>;
