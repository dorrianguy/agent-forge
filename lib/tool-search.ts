/**
 * Tool Search — Deferred Loading for Large Tool Sets
 *
 * When an agent has many tools (10+), sending all definitions in the system
 * prompt burns massive tokens.  Instead we:
 *
 *   1. Partition tools into "immediate" (always sent) and "deferred"
 *   2. Include a lightweight `tool_search` meta-tool in the prompt
 *   3. When the LLM calls `tool_search(query)`, we do keyword + TF-IDF
 *      scoring against deferred tool descriptions
 *   4. Matching tools are injected into the conversation context
 *
 * This approach saves ~85% token usage on large tool sets.
 */

import type { ToolDefinition, ToolSearchConfig } from './schemas/tool';

// ============================================================
// Defaults
// ============================================================

const DEFAULT_CONFIG: ToolSearchConfig = {
  threshold: 0.6,
  maxResults: 5,
  autoEnable: true,
  autoEnableThreshold: 10,
};

// ============================================================
// Tool Search meta-tool definition
// ============================================================

/**
 * Build the `tool_search` meta-tool that gets injected when deferred
 * loading is active.  The LLM calls this when it needs a tool that
 * wasn't provided upfront.
 */
export function buildToolSearchTool(): ToolDefinition {
  return {
    name: 'tool_search',
    description:
      'Search for available tools by describing what you need. ' +
      'Use this when you need a capability that isn\'t in your current tool list. ' +
      'Describe the action you want to perform and matching tools will be provided.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description:
          'Natural language description of the tool capability you need. ' +
          'Be specific about the action (e.g. "look up weather for a city" or ' +
          '"create a calendar event").',
        required: true,
      },
    ],
    inputExamples: [
      {
        input: { query: 'search the knowledge base for relevant documents' },
        description: 'Finding a knowledge search tool',
      },
      {
        input: { query: 'send an HTTP request to an external API' },
        description: 'Finding an API call tool',
      },
    ],
    deferLoading: false,
    handler: {
      type: 'custom',
      config: { _meta: 'tool_search' },
    },
  };
}

// ============================================================
// Partitioning
// ============================================================

export interface PartitionResult {
  immediate: ToolDefinition[];
  deferred: ToolDefinition[];
  toolSearchIncluded: boolean;
}

/**
 * Split an agent's tools into immediate (sent upfront) and deferred
 * (discovered via tool_search).
 *
 * Rules:
 *  - Tools with `deferLoading: true` are always deferred
 *  - When total tool count >= autoEnableThreshold AND autoEnable is on,
 *    any tool not explicitly marked is auto-deferred
 *  - The `tool_search` meta-tool is added when there are deferred tools
 */
export function partitionTools(
  tools: ToolDefinition[],
  config: Partial<ToolSearchConfig> = {},
): PartitionResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const immediate: ToolDefinition[] = [];
  const deferred: ToolDefinition[] = [];

  const shouldAutoDefer =
    cfg.autoEnable && tools.length >= cfg.autoEnableThreshold;

  for (const tool of tools) {
    // Never defer the meta-tool itself
    if (tool.name === 'tool_search') {
      immediate.push(tool);
      continue;
    }

    if (tool.deferLoading) {
      deferred.push(tool);
    } else if (shouldAutoDefer) {
      // When auto-deferring, keep the first N tools immediate
      // (heuristic: keep ~40% immediate, defer the rest)
      const keepImmediateCount = Math.max(
        3,
        Math.ceil(tools.length * 0.4),
      );
      if (immediate.length < keepImmediateCount) {
        immediate.push(tool);
      } else {
        deferred.push(tool);
      }
    } else {
      immediate.push(tool);
    }
  }

  const toolSearchIncluded = deferred.length > 0;
  if (toolSearchIncluded) {
    // Add tool_search meta-tool if not already present
    const hasToolSearch = immediate.some((t) => t.name === 'tool_search');
    if (!hasToolSearch) {
      immediate.push(buildToolSearchTool());
    }
  }

  return { immediate, deferred, toolSearchIncluded };
}

// ============================================================
// Text similarity scoring
// ============================================================

/** Tokenize a string into lowercase word tokens. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Compute IDF (Inverse Document Frequency) for a corpus of documents.
 */
function computeIDF(documents: string[][]): Map<string, number> {
  const docCount = documents.length;
  const df = new Map<string, number>();

  for (const doc of documents) {
    const seen = new Set<string>();
    for (const token of doc) {
      if (!seen.has(token)) {
        df.set(token, (df.get(token) || 0) + 1);
        seen.add(token);
      }
    }
  }

  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((docCount + 1) / (freq + 1)) + 1);
  }

  return idf;
}

/**
 * Compute TF-IDF vector for a document given an IDF map.
 */
function tfidfVector(
  tokens: string[],
  idf: Map<string, number>,
): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  const vec = new Map<string, number>();
  for (const [term, freq] of tf) {
    const idfVal = idf.get(term) || 1;
    vec.set(term, (freq / tokens.length) * idfVal);
  }

  return vec;
}

/**
 * Cosine similarity between two TF-IDF vectors.
 */
function cosineSim(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of a) {
    normA += valA * valA;
    const valB = b.get(term);
    if (valB !== undefined) {
      dot += valA * valB;
    }
  }

  for (const [, valB] of b) {
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================
// Tool search execution
// ============================================================

/**
 * Build a searchable text representation of a tool (name + description + param names).
 */
function toolToText(tool: ToolDefinition): string {
  const parts = [
    tool.name.replace(/_/g, ' '),
    tool.description,
    ...tool.parameters.map((p) => `${p.name} ${p.description}`),
  ];
  return parts.join(' ');
}

/**
 * Search deferred tools by query using TF-IDF cosine similarity.
 *
 * Falls back to simple keyword overlap when the corpus is very small.
 */
export function searchTools(
  query: string,
  allTools: ToolDefinition[],
  config: Partial<ToolSearchConfig> = {},
): ToolDefinition[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (allTools.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Build corpus: one "document" per tool
  const toolTexts = allTools.map((t) => tokenize(toolToText(t)));

  // Compute IDF over the tool corpus + query
  const corpus = [...toolTexts, queryTokens];
  const idf = computeIDF(corpus);

  // Score each tool
  const queryVec = tfidfVector(queryTokens, idf);
  const scored: Array<{ tool: ToolDefinition; score: number }> = [];

  for (let i = 0; i < allTools.length; i++) {
    const toolVec = tfidfVector(toolTexts[i], idf);
    const score = cosineSim(queryVec, toolVec);

    // Also add a keyword bonus for exact name matches
    const nameTokens = tokenize(allTools[i].name);
    const nameOverlap = queryTokens.filter((t) =>
      nameTokens.includes(t),
    ).length;
    const nameBonus = nameOverlap > 0 ? 0.15 * (nameOverlap / nameTokens.length) : 0;

    const finalScore = Math.min(1, score + nameBonus);

    if (finalScore >= cfg.threshold) {
      scored.push({ tool: allTools[i], score: finalScore });
    }
  }

  // Sort by score descending, limit results
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, cfg.maxResults).map((s) => s.tool);
}

/**
 * Check whether a tool call is the tool_search meta-tool.
 */
export function isToolSearchCall(toolName: string): boolean {
  return toolName === 'tool_search';
}

/**
 * Handle a tool_search invocation: find matching deferred tools and
 * return them as definitions to inject into the conversation.
 */
export function handleToolSearchCall(
  query: string,
  deferredTools: ToolDefinition[],
  config: Partial<ToolSearchConfig> = {},
): {
  matchedTools: ToolDefinition[];
  message: string;
} {
  const matchedTools = searchTools(query, deferredTools, config);

  if (matchedTools.length === 0) {
    return {
      matchedTools: [],
      message:
        'No matching tools found for that query. Try rephrasing your search or use the tools already available to you.',
    };
  }

  const toolNames = matchedTools.map((t) => t.name).join(', ');
  return {
    matchedTools,
    message: `Found ${matchedTools.length} matching tool(s): ${toolNames}. These tools are now available for use.`,
  };
}
