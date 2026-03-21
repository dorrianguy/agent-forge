/**
 * Provider-Agnostic Tool Registry
 *
 * A centralized registry that stores tool definitions with their Zod schemas
 * and handlers, then converts them to the format required by OpenAI,
 * Anthropic, or Google at call time.
 *
 * Also provides a built-in tool catalog (search_knowledge_base, schedule_meeting,
 * etc.) accessible via getToolsForAgent / getToolsForAgent for functional usage.
 *
 * Usage (class-based):
 *   const registry = new ToolRegistry();
 *   registry.register('get_weather', GetWeatherSchema, getWeatherHandler);
 *   const tools = registry.toOpenAITools();
 *   const tools = registry.toAnthropicTools();
 *
 * Usage (functional):
 *   const tools = getToolsForAgent(['search_knowledge_base'], 'anthropic');
 */

import { z } from 'zod';
import { toJsonSchema, toolParamsToJsonSchema } from './schemas/json-schema';
import type { ToolDefinition, ToolParameter } from './schemas/tool';
import { partitionTools } from './tool-search';
import type { PartitionResult } from './tool-search';
import { zodToToolSchema } from './schemas';

// ============================================================
// Types
// ============================================================

export interface ToolOpts {
  /** Mark for deferred loading (tool search). */
  deferLoading?: boolean;
  /** Up to 5 input examples for few-shot. */
  inputExamples?: Array<{ input: Record<string, unknown>; output?: unknown; description?: string }>;
}

export interface RegisteredTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  schema: z.ZodType;
  handler: RegistryToolHandler;
  deferLoading: boolean;
  inputExamples: Array<{ input: Record<string, unknown>; output?: unknown; description?: string }>;
}

export type RegistryToolHandler = (
  args: Record<string, unknown>,
) => Promise<unknown> | unknown;

// ============================================================
// Provider-specific output shapes
// ============================================================

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface GoogleTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export type ToolFormat = 'anthropic' | 'openai';

// ============================================================
// ToolRegistry class
// ============================================================

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  // ----------------------------------------------------------
  // Core CRUD
  // ----------------------------------------------------------

  /**
   * Register a tool by name with a Zod input schema and handler function.
   */
  register(
    name: string,
    schema: z.ZodType,
    handler: RegistryToolHandler,
    opts?: ToolOpts,
  ): void {
    const jsonSchema = toJsonSchema(schema, name);

    // Extract description and parameters from the JSON Schema
    const description =
      (jsonSchema.description as string) ||
      `Execute the ${name} tool`;

    const parameters = this.extractParameters(jsonSchema);

    this.tools.set(name, {
      name,
      description,
      parameters,
      schema,
      handler,
      deferLoading: opts?.deferLoading ?? false,
      inputExamples: opts?.inputExamples ?? [],
    });
  }

  /**
   * Register a tool from a ToolDefinition (e.g. loaded from agent config).
   */
  registerFromDefinition(
    definition: ToolDefinition,
    handler: RegistryToolHandler,
  ): void {
    // Build a Zod schema from the parameter list
    const shape: Record<string, z.ZodType> = {};
    for (const param of definition.parameters) {
      let fieldSchema = this.zodTypeFromString(param.type);
      if (param.description) {
        fieldSchema = fieldSchema.describe(param.description);
      }
      if (!param.required) {
        fieldSchema = fieldSchema.optional();
      }
      shape[param.name] = fieldSchema;
    }

    const schema = z.object(shape).describe(definition.description);

    this.tools.set(definition.name, {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
      schema,
      handler,
      deferLoading: definition.deferLoading,
      inputExamples: definition.inputExamples ?? [],
    });
  }

  /**
   * Get a registered tool by name.
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools.
   */
  list(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Remove a tool by name.
   */
  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all tools from the registry.
   */
  clear(): void {
    this.tools.clear();
  }

  get size(): number {
    return this.tools.size;
  }

  // ----------------------------------------------------------
  // Execution
  // ----------------------------------------------------------

  /**
   * Execute a tool by name with the given arguments.
   * Validates input against the Zod schema before calling the handler.
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; validated: boolean }> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }

    // Validate input
    const parseResult = tool.schema.safeParse(args);
    if (!parseResult.success) {
      throw new Error(
        `Invalid input for tool "${name}": ${parseResult.error.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const result = await tool.handler(parseResult.data as Record<string, unknown>);
    return { result, validated: true };
  }

  // ----------------------------------------------------------
  // Provider conversions
  // ----------------------------------------------------------

  /**
   * Convert all (or filtered) tools to OpenAI function-calling format.
   */
  toOpenAITools(filter?: (tool: RegisteredTool) => boolean): OpenAITool[] {
    const tools = filter ? this.list().filter(filter) : this.list();

    return tools.map((tool) => {
      const { properties, required } = toolParamsToJsonSchema(tool.parameters);

      const parameterSchema: Record<string, unknown> = {
        type: 'object',
        properties,
      };
      if (required.length > 0) {
        parameterSchema.required = required;
      }

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: this.buildDescription(tool),
          parameters: parameterSchema,
        },
      };
    });
  }

  /**
   * Convert all (or filtered) tools to Anthropic tool_use format.
   */
  toAnthropicTools(
    filter?: (tool: RegisteredTool) => boolean,
  ): AnthropicTool[] {
    const tools = filter ? this.list().filter(filter) : this.list();

    return tools.map((tool) => {
      const { properties, required } = toolParamsToJsonSchema(tool.parameters);

      const inputSchema: Record<string, unknown> = {
        type: 'object',
        properties,
      };
      if (required.length > 0) {
        inputSchema.required = required;
      }

      return {
        name: tool.name,
        description: this.buildDescription(tool),
        input_schema: inputSchema,
      };
    });
  }

  /**
   * Convert all (or filtered) tools to Google/Gemini format.
   */
  toGoogleTools(
    filter?: (tool: RegisteredTool) => boolean,
  ): GoogleTool[] {
    const tools = filter ? this.list().filter(filter) : this.list();

    const declarations = tools.map((tool) => {
      const { properties, required } = toolParamsToJsonSchema(tool.parameters);

      const parameters: Record<string, unknown> = {
        type: 'object',
        properties,
      };
      if (required.length > 0) {
        parameters.required = required;
      }

      return {
        name: tool.name,
        description: this.buildDescription(tool),
        parameters,
      };
    });

    // Google wraps all declarations in a single tool object
    return declarations.length > 0
      ? [{ functionDeclarations: declarations }]
      : [];
  }

  // ----------------------------------------------------------
  // Partitioning (for tool search / deferred loading)
  // ----------------------------------------------------------

  /**
   * Partition tools into immediate and deferred sets.
   */
  partition(
    config?: { threshold?: number; maxResults?: number; autoEnable?: boolean; autoEnableThreshold?: number },
  ): PartitionResult {
    const definitions: ToolDefinition[] = this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      inputExamples: tool.inputExamples,
      deferLoading: tool.deferLoading,
      handler: { type: 'custom' as const, config: {} },
    }));

    return partitionTools(definitions, config);
  }

  // ----------------------------------------------------------
  // Schema export
  // ----------------------------------------------------------

  /**
   * Export all tool input schemas as JSON Schema objects.
   * Useful for documentation, LLM structured output, etc.
   */
  getJsonSchemas(): Record<string, Record<string, unknown>> {
    const schemas: Record<string, Record<string, unknown>> = {};
    for (const tool of this.tools.values()) {
      schemas[tool.name] = toJsonSchema(tool.schema, tool.name);
    }
    return schemas;
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  /**
   * Build a description string including input examples if present.
   */
  private buildDescription(tool: RegisteredTool): string {
    let desc = tool.description;

    if (tool.inputExamples.length > 0) {
      desc += '\n\nExamples:';
      for (const ex of tool.inputExamples) {
        const label = ex.description ? ` (${ex.description})` : '';
        desc += `\n  Input${label}: ${JSON.stringify(ex.input)}`;
        if (ex.output !== undefined) {
          desc += `\n  Output: ${JSON.stringify(ex.output)}`;
        }
      }
    }

    return desc;
  }

  /**
   * Map a string type name to a Zod type.
   */
  private zodTypeFromString(type: string): z.ZodType {
    switch (type) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'array':
        return z.array(z.unknown());
      case 'object':
        return z.record(z.string(), z.unknown());
      default:
        return z.unknown();
    }
  }

  /**
   * Extract parameter info from a JSON Schema properties object.
   */
  private extractParameters(
    jsonSchema: Record<string, unknown>,
  ): ToolParameter[] {
    const props =
      (jsonSchema.properties as Record<string, Record<string, unknown>>) || {};
    const req = (jsonSchema.required as string[]) || [];
    const params: ToolParameter[] = [];

    for (const [name, prop] of Object.entries(props)) {
      params.push({
        name,
        type: (prop.type as ToolParameter['type']) || 'string',
        description: (prop.description as string) || '',
        required: req.includes(name),
      });
    }

    return params;
  }
}

// ============================================================
// Factory helper
// ============================================================

/**
 * Create a ToolRegistry pre-loaded from an array of ToolDefinitions
 * (e.g. from agent config stored in Supabase).
 *
 * Each tool gets a placeholder handler that throws — replace with
 * real handlers via `registry.get(name)` or by the execution engine.
 */
export function createRegistryFromDefinitions(
  definitions: ToolDefinition[],
  handlers?: Record<string, RegistryToolHandler>,
): ToolRegistry {
  const registry = new ToolRegistry();

  for (const def of definitions) {
    const handler =
      handlers?.[def.name] ??
      (() => {
        throw new Error(
          `No handler registered for tool "${def.name}". Register one before execution.`,
        );
      });

    registry.registerFromDefinition(def, handler);
  }

  return registry;
}

// ============================================================
// Built-in tool catalog (functional API)
// ============================================================

export interface BuiltinToolDefinition {
  name: string;
  description: string;
  category: string;
  inputSchema: z.ZodType;
  examples?: BuiltinToolExample[];
  /** If true, tool is always included (not deferred). */
  alwaysInclude?: boolean;
}

export interface BuiltinToolExample {
  userMessage: string;
  toolCall: Record<string, unknown>;
  reasoning?: string;
}

const SearchKnowledgeBaseSchema = z.object({
  query: z.string().min(1).describe('The search query to find relevant knowledge'),
  maxResults: z.number().int().min(1).max(20).default(5).describe('Maximum number of results'),
  filter: z
    .object({
      source: z.string().optional().describe('Filter by source name'),
      type: z.enum(['text', 'url', 'file']).optional().describe('Filter by content type'),
    })
    .optional()
    .describe('Optional filters'),
});

const ScheduleMeetingSchema = z.object({
  title: z.string().min(1).max(200).describe('Meeting title'),
  dateTime: z.string().describe('ISO 8601 datetime for the meeting'),
  duration: z.number().int().min(15).max(480).default(30).describe('Duration in minutes'),
  attendeeEmail: z.string().email().describe('Email of the attendee'),
  notes: z.string().max(1000).optional().describe('Optional meeting notes'),
});

const CreateTicketSchema = z.object({
  subject: z.string().min(1).max(200).describe('Ticket subject'),
  description: z.string().min(1).max(5000).describe('Detailed description of the issue'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Ticket priority'),
  category: z.string().optional().describe('Ticket category'),
  customerEmail: z.string().email().optional().describe('Customer email for follow-up'),
});

const LookupOrderSchema = z.object({
  orderId: z.string().min(1).describe('The order ID to look up'),
  includeHistory: z.boolean().default(false).describe('Include order status history'),
});

const SendEmailSchema = z.object({
  to: z.string().email().describe('Recipient email address'),
  subject: z.string().min(1).max(200).describe('Email subject line'),
  body: z.string().min(1).max(10000).describe('Email body (supports markdown)'),
  replyTo: z.string().email().optional().describe('Reply-to address'),
});

const CalculatePriceSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().describe('Product identifier'),
        quantity: z.number().int().min(1).describe('Quantity'),
      }),
    )
    .min(1)
    .describe('Items to price'),
  couponCode: z.string().optional().describe('Discount coupon code'),
  currency: z.string().length(3).default('USD').describe('ISO currency code'),
});

const TransferToHumanSchema = z.object({
  reason: z.string().min(1).max(500).describe('Why the conversation needs human attention'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Escalation priority'),
  department: z.string().optional().describe('Target department (e.g., "billing", "technical")'),
  summary: z.string().max(2000).optional().describe('Conversation summary for the human agent'),
});

const BUILTIN_TOOLS: BuiltinToolDefinition[] = [
  {
    name: 'search_knowledge_base',
    description:
      "Search the agent's knowledge base for relevant information. Use when the user asks a question that may be answered by stored documents, FAQs, or product info.",
    category: 'knowledge',
    inputSchema: SearchKnowledgeBaseSchema,
    alwaysInclude: true,
    examples: [
      {
        userMessage: 'What is your refund policy?',
        toolCall: { query: 'refund policy return', maxResults: 3 },
        reasoning: 'User is asking about a policy, search knowledge base for refund-related docs.',
      },
    ],
  },
  {
    name: 'schedule_meeting',
    description:
      'Schedule a meeting or appointment with a customer. Use when the user wants to book a demo, consultation, or follow-up call.',
    category: 'scheduling',
    inputSchema: ScheduleMeetingSchema,
    examples: [
      {
        userMessage: 'Can I book a demo for next Tuesday at 2pm?',
        toolCall: {
          title: 'Product Demo',
          dateTime: '2026-02-24T14:00:00Z',
          duration: 30,
          attendeeEmail: 'customer@example.com',
        },
        reasoning: 'User wants to schedule a demo, extract time and create meeting.',
      },
    ],
  },
  {
    name: 'create_support_ticket',
    description:
      'Create a support ticket for an issue that cannot be resolved in chat. Use when the user reports a bug, technical issue, or complex problem requiring investigation.',
    category: 'support',
    inputSchema: CreateTicketSchema,
    examples: [
      {
        userMessage: 'My dashboard has been showing wrong data since yesterday',
        toolCall: {
          subject: 'Dashboard displaying incorrect data',
          description: 'Customer reports dashboard data has been incorrect since yesterday. Needs investigation.',
          priority: 'high',
          category: 'bug',
        },
      },
    ],
  },
  {
    name: 'lookup_order',
    description:
      "Look up order details by order ID. Use when the user asks about their order status, shipping, or order history.",
    category: 'orders',
    inputSchema: LookupOrderSchema,
    examples: [
      {
        userMessage: "Where's my order #ORD-12345?",
        toolCall: { orderId: 'ORD-12345', includeHistory: true },
      },
    ],
  },
  {
    name: 'send_email',
    description:
      'Send an email to a customer or team member. Use for follow-ups, confirmations, or sending requested information.',
    category: 'communication',
    inputSchema: SendEmailSchema,
  },
  {
    name: 'calculate_price',
    description:
      'Calculate the total price for a set of items, optionally applying a coupon. Use when the user asks about pricing or wants a quote.',
    category: 'commerce',
    inputSchema: CalculatePriceSchema,
  },
  {
    name: 'transfer_to_human',
    description:
      'Transfer the conversation to a human agent. Use when the user explicitly asks for a human, when the issue is too complex, or when sensitive topics arise.',
    category: 'escalation',
    alwaysInclude: true,
    inputSchema: TransferToHumanSchema,
    examples: [
      {
        userMessage: 'I want to speak to a real person',
        toolCall: {
          reason: 'Customer requested human agent',
          priority: 'medium',
        },
      },
    ],
  },
];

// ============================================================
// Tool search (deferred loading)
// ============================================================

const ToolSearchSchema = z.object({
  query: z.string().min(1).describe('Natural language description of the capability needed'),
  category: z.string().optional().describe('Tool category to narrow search'),
});

const TOOL_SEARCH_DEFINITION: BuiltinToolDefinition = {
  name: 'search_tools',
  description:
    "Search for available tools by describing what you need to do. Returns matching tools that you can then use. Call this when you need a capability that isn't in your current tool set.",
  category: 'meta',
  inputSchema: ToolSearchSchema,
  alwaysInclude: true,
};

/**
 * Search the builtin tool registry by query string.
 */
export function searchTools(
  query: string,
  category?: string,
  allTools: BuiltinToolDefinition[] = BUILTIN_TOOLS,
): BuiltinToolDefinition[] {
  const q = query.toLowerCase();
  return allTools
    .filter((tool) => {
      if (category && tool.category !== category) return false;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);
}

// ============================================================
// Format converters (functional)
// ============================================================

function builtinToolDescription(tool: BuiltinToolDefinition): string {
  let desc = tool.description;

  if (tool.examples && tool.examples.length > 0) {
    desc += '\n\nExamples:';
    for (const ex of tool.examples.slice(0, 2)) {
      desc += `\nUser: "${ex.userMessage}"`;
      desc += `\nTool call: ${JSON.stringify(ex.toolCall)}`;
      if (ex.reasoning) desc += `\nReasoning: ${ex.reasoning}`;
    }
  }

  return desc;
}

function toAnthropicBuiltin(tool: BuiltinToolDefinition): AnthropicTool {
  return {
    name: tool.name,
    description: builtinToolDescription(tool),
    input_schema: zodToToolSchema(tool.inputSchema),
  };
}

function toOpenAIBuiltin(tool: BuiltinToolDefinition): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: builtinToolDescription(tool),
      parameters: zodToToolSchema(tool.inputSchema),
    },
  };
}

// ============================================================
// PUBLIC FUNCTIONAL API
// ============================================================

/**
 * Get tools for an agent, formatted for the target provider.
 *
 * If the agent has > 5 tools, uses deferred loading:
 * - Only always-include tools + search_tools are sent initially
 * - LLM calls search_tools to discover & load additional tools on demand
 * - Saves ~85% of tool-description tokens for large tool sets
 */
export function getToolsForAgent(
  agentToolNames: string[],
  format: ToolFormat,
  options?: { deferredThreshold?: number },
): (AnthropicTool | OpenAITool)[] {
  const threshold = options?.deferredThreshold ?? 5;
  const matched = BUILTIN_TOOLS.filter((t) => agentToolNames.includes(t.name));

  const useDeferred = matched.length > threshold;
  const toolsToSend = useDeferred
    ? [...matched.filter((t) => t.alwaysInclude), TOOL_SEARCH_DEFINITION]
    : matched;

  if (format === 'anthropic') {
    return toolsToSend.map(toAnthropicBuiltin);
  }
  return toolsToSend.map(toOpenAIBuiltin);
}

/**
 * Get all available builtin tool definitions (for UI display, tool picker, etc).
 */
export function getAllTools(): BuiltinToolDefinition[] {
  return [...BUILTIN_TOOLS];
}

/**
 * Get builtin tool by name.
 */
export function getToolByName(name: string): BuiltinToolDefinition | undefined {
  return BUILTIN_TOOLS.find((t) => t.name === name);
}

/**
 * Register a custom tool in the builtin catalog (for user-defined tools via the flow builder).
 */
export function registerCustomTool(tool: BuiltinToolDefinition): void {
  const existing = BUILTIN_TOOLS.findIndex((t) => t.name === tool.name);
  if (existing >= 0) {
    BUILTIN_TOOLS[existing] = tool;
  } else {
    BUILTIN_TOOLS.push(tool);
  }
}

/**
 * Convert tools to a specific provider format.
 */
export function convertTools(
  tools: BuiltinToolDefinition[],
  format: ToolFormat,
): (AnthropicTool | OpenAITool)[] {
  if (format === 'anthropic') {
    return tools.map(toAnthropicBuiltin);
  }
  return tools.map(toOpenAIBuiltin);
}
