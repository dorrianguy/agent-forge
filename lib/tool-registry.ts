/**
 * Agent Forge - Provider-Agnostic Tool Registry
 *
 * Defines tools once, converts to Anthropic or OpenAI format on demand.
 * Supports deferred loading (tool search) for 85% token savings on 10+ tools.
 */

import { z } from 'zod';
import { zodToToolSchema } from './schemas';

// ============================================================
// CORE TYPES
// ============================================================

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  inputSchema: z.ZodType;
  examples?: ToolExample[];
  /** If true, tool is always included (not deferred). */
  alwaysInclude?: boolean;
}

export interface ToolExample {
  userMessage: string;
  toolCall: Record<string, unknown>;
  reasoning?: string;
}

// ============================================================
// BUILT-IN TOOLS
// ============================================================

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

// ============================================================
// TOOL REGISTRY
// ============================================================

const TOOLS: ToolDefinition[] = [
  {
    name: 'search_knowledge_base',
    description:
      'Search the agent\'s knowledge base for relevant information. Use when the user asks a question that may be answered by stored documents, FAQs, or product info.',
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
        userMessage: "My dashboard has been showing wrong data since yesterday",
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
      'Look up order details by order ID. Use when the user asks about their order status, shipping, or order history.',
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
// TOOL SEARCH (deferred loading)
// ============================================================

/**
 * The meta-tool that lets the LLM search for tools it needs.
 * Only included when an agent has > 5 tools configured.
 */
const ToolSearchSchema = z.object({
  query: z.string().min(1).describe('Natural language description of the capability needed'),
  category: z.string().optional().describe('Tool category to narrow search'),
});

const TOOL_SEARCH_DEFINITION: ToolDefinition = {
  name: 'search_tools',
  description:
    'Search for available tools by describing what you need to do. Returns matching tools that you can then use. Call this when you need a capability that isn\'t in your current tool set.',
  category: 'meta',
  inputSchema: ToolSearchSchema,
  alwaysInclude: true,
};

/**
 * Search the tool registry by query string.
 * Used by the search_tools meta-tool at runtime.
 */
export function searchTools(
  query: string,
  category?: string,
  allTools: ToolDefinition[] = TOOLS,
): ToolDefinition[] {
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
// FORMAT CONVERTERS
// ============================================================

export type ToolFormat = 'anthropic' | 'openai';

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

function toAnthropicTool(tool: ToolDefinition): AnthropicTool {
  return {
    name: tool.name,
    description: buildDescription(tool),
    input_schema: zodToToolSchema(tool.inputSchema),
  };
}

function toOpenAITool(tool: ToolDefinition): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: buildDescription(tool),
      parameters: zodToToolSchema(tool.inputSchema),
    },
  };
}

/**
 * Build tool description including examples (few-shot) for reliable tool use.
 */
function buildDescription(tool: ToolDefinition): string {
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

// ============================================================
// PUBLIC API
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
  const matched = TOOLS.filter((t) => agentToolNames.includes(t.name));

  const useDeferred = matched.length > threshold;
  const toolsToSend = useDeferred
    ? [...matched.filter((t) => t.alwaysInclude), TOOL_SEARCH_DEFINITION]
    : matched;

  if (format === 'anthropic') {
    return toolsToSend.map(toAnthropicTool);
  }
  return toolsToSend.map(toOpenAITool);
}

/**
 * Get all available tool definitions (for UI display, tool picker, etc).
 */
export function getAllTools(): ToolDefinition[] {
  return [...TOOLS];
}

/**
 * Get tool by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}

/**
 * Register a custom tool (for user-defined tools via the flow builder).
 */
export function registerCustomTool(tool: ToolDefinition): void {
  const existing = TOOLS.findIndex((t) => t.name === tool.name);
  if (existing >= 0) {
    TOOLS[existing] = tool;
  } else {
    TOOLS.push(tool);
  }
}

/**
 * Convert tools to a specific provider format.
 */
export function convertTools(
  tools: ToolDefinition[],
  format: ToolFormat,
): (AnthropicTool | OpenAITool)[] {
  if (format === 'anthropic') {
    return tools.map(toAnthropicTool);
  }
  return tools.map(toOpenAITool);
}
