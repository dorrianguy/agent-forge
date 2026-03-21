/**
 * Converts Zod schemas to JSON Schema for LLM structured output.
 *
 * Uses zod-to-json-schema under the hood, with a thin wrapper that
 * produces clean, provider-friendly JSON Schema objects.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Convert any Zod schema to a JSON Schema object.
 *
 * @param schema  The Zod schema to convert
 * @param name    Optional name for the root definition
 * @returns       A plain JSON Schema object ready for LLM consumption
 *
 * @example
 * ```ts
 * const jsonSchema = toJsonSchema(ToolDefinitionSchema, 'ToolDefinition');
 * // Pass to OpenAI structured output, Anthropic tool_use, etc.
 * ```
 */
export function toJsonSchema(
  schema: z.ZodType,
  name?: string,
): Record<string, unknown> {
  const raw = zodToJsonSchema(schema as any, {
    name: name ?? 'Schema',
    $refStrategy: 'none', // inline all refs for LLM compatibility
    errorMessages: false,
  });

  // zodToJsonSchema may nest under `definitions` when a name is given.
  // Flatten to the schema itself for direct LLM use.
  if (
    name &&
    typeof raw === 'object' &&
    raw !== null &&
    'definitions' in raw
  ) {
    const defs = (raw as Record<string, unknown>).definitions as Record<
      string,
      unknown
    >;
    if (defs[name]) {
      return defs[name] as Record<string, unknown>;
    }
  }

  // Remove $schema and top-level metadata LLMs don't need
  const result = { ...raw } as Record<string, unknown>;
  delete result.$schema;
  return result;
}

/**
 * Convert Zod tool parameter schemas into a JSON Schema "properties" object
 * suitable for function calling across providers.
 *
 * @param params  Array of ToolParameter-shaped Zod-validated objects
 * @returns       JSON Schema properties + required array
 */
export function toolParamsToJsonSchema(
  params: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: unknown;
    enum?: string[];
  }>,
): { properties: Record<string, unknown>; required: string[] } {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of params) {
    const prop: Record<string, unknown> = {
      type: param.type,
      description: param.description,
    };

    if (param.default !== undefined) {
      prop.default = param.default;
    }

    if (param.enum && param.enum.length > 0) {
      prop.enum = param.enum;
    }

    properties[param.name] = prop;

    if (param.required) {
      required.push(param.name);
    }
  }

  return { properties, required };
}
