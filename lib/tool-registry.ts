/**
 * Provider-Agnostic Tool Registry
 *
 * A centralized registry that stores tool definitions with their Zod schemas
 * and handlers, then converts them to the format required by OpenAI,
 * Anthropic, or Google at call time.
 *
 * Usage:
 *   const registry = new ToolRegistry();
 *   registry.register('get_weather', GetWeatherSchema, getWeatherHandler);
 *   const tools = registry.toOpenAITools();   // → OpenAI function-calling format
 *   const tools = registry.toAnthropicTools(); // → Anthropic tool_use format
 */

import { z } from 'zod';
import { toJsonSchema, toolParamsToJsonSchema } from './schemas/json-schema';
import type { ToolDefinition, ToolParameter } from './schemas/tool';
import { partitionTools } from './tool-search';
import type { PartitionResult } from './tool-search';

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
  handler: ToolHandler;
  deferLoading: boolean;
  inputExamples: Array<{ input: Record<string, unknown>; output?: unknown; description?: string }>;
}

export type ToolHandler = (
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
    handler: ToolHandler,
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
    handler: ToolHandler,
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

    const result = await tool.handler(parseResult.data);
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
        return z.record(z.unknown());
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
  handlers?: Record<string, ToolHandler>,
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
