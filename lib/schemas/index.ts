/**
 * Centralized schema exports for Agent Forge.
 *
 * Every Zod schema used across the app should be imported from here
 * (or from its sub-module directly).
 */

// Common / shared
export {
  UUIDSchema,
  EmailSchema,
  SlugSchema,
  PaginationSchema,
  PlanSchema,
  VALID_PLANS,
  PLAN_AGENT_LIMITS,
  sanitizeString,
  sanitizeObject,
  sanitizeTransform,
  paginationWithSort,
} from './common';
export type { PaginationInput, PlanType } from './common';

// Agent schemas
export {
  VALID_AGENT_TYPES,
  AgentTypeSchema,
  VALID_AGENT_STATUSES,
  AgentStatusSchema,
  EscalationLevelSchema,
  ModelEscalationConfigSchema,
  AgentConfigSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
} from './agent';
export type {
  AgentType,
  AgentStatus,
  EscalationLevel,
  ModelEscalationConfig,
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from './agent';

// Tool schemas
export {
  TOOL_PARAM_TYPES,
  ToolParameterSchema,
  TOOL_HANDLER_TYPES,
  ToolHandlerSchema,
  ToolInputExampleSchema,
  ToolDefinitionSchema,
  ToolRegistryConfigSchema,
  ToolSearchConfigSchema,
} from './tool';
export type {
  ToolParamType,
  ToolParameter,
  ToolHandlerType,
  ToolHandler,
  ToolInputExample,
  ToolDefinition,
  ToolRegistryConfig,
  ToolSearchConfig,
} from './tool';

// Flow schemas
export {
  NodeTypeSchema,
  FlowNodeDataSchema,
  FlowNodeSchema,
  FlowEdgeSchema,
  FlowVariableSchema,
  FlowSettingsSchema,
  FlowSchema,
  FlowExportSchema,
  StartNodeDataSchema,
  MessageNodeDataSchema,
  UserInputNodeDataSchema,
  ConditionNodeDataSchema,
  AIResponseNodeDataSchema,
  APICallNodeDataSchema,
  SetVariableNodeDataSchema,
  HandoffNodeDataSchema,
  EndNodeDataSchema,
} from './flow';
export type {
  NodeType,
  FlowNodeData,
  FlowNode,
  FlowEdge,
  FlowVariable,
  FlowSettings,
  Flow,
  FlowExport,
} from './flow';

// TTS schemas
export {
  VALID_VOICES,
  VoiceSchema,
  buildTTSInputSchema,
} from './tts';
export type { Voice, TTSInput } from './tts';

// JSON Schema utility
export { toJsonSchema } from './json-schema';
