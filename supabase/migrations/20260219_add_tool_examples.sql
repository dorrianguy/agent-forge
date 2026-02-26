-- Migration: Add tool_examples JSONB column to agents table
-- Stores per-tool input/output example pairs for few-shot prompting
--
-- Structure:
-- {
--   "tool_name": [
--     { "input": { "param": "value" }, "output": "result", "description": "..." },
--     ...
--   ]
-- }

ALTER TABLE agents ADD COLUMN IF NOT EXISTS tool_examples JSONB DEFAULT '{}';

-- Index for efficient querying of agents that have examples
CREATE INDEX IF NOT EXISTS idx_agents_tool_examples
  ON agents USING gin (tool_examples)
  WHERE tool_examples != '{}';

COMMENT ON COLUMN agents.tool_examples IS
  'Per-tool input/output example pairs for few-shot LLM prompting. Keyed by tool name.';
