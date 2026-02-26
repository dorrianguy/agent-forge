# Agent Forge — Trigger.dev v4 Durable Execution Integration

## Overview
Replace Agent Forge's in-process asyncio task queue with Trigger.dev v4 for durable, crash-resistant agent execution. Agent runs must survive server restarts, support step-level retries, and enable human-in-the-loop approval flows.

## Problem Statement
Current state: Agent runs use Python asyncio with in-memory task queues (`orchestrator.py`). If the server crashes mid-run, all tasks are lost. No step-level retry — a failed LLM call restarts the entire pipeline. No pause/resume for human approval. No observability into individual run steps.

## Architecture Decision
- **Trigger.dev v4** for all agent workflow execution (approved Feb 25, 2026)
- Trigger.dev runs as a TypeScript worker service alongside the Next.js frontend
- Python backend remains for existing business logic; agent _execution_ moves to Trigger.dev tasks
- Frontend communicates with Trigger.dev via its TypeScript SDK for run status/streaming

## Requirements

### R1: Agent Run as Trigger.dev Task
- Each user-initiated agent run creates a Trigger.dev task
- Task receives: `agentId`, `userId`, `prompt`, `agentConfig` (model, tools, system prompt)
- Task executes as durable multi-step workflow with checkpoint after each step

### R2: Step-Level Durability
- **Step 1:** Load agent config from Supabase
- **Step 2:** Execute LLM call (Claude/OpenAI) — auto-retry on rate limit (429) or transient errors
- **Step 3:** If agent has tools, execute tool calls as sub-steps
- **Step 4:** If multi-turn, loop steps 2-3 with conversation state
- **Step 5:** Save result to Supabase
- Each step independently retryable — failure at step 3 resumes from step 3, not step 1

### R3: Human-in-the-Loop (Waitpoints)
- Agents can be configured with `requiresApproval: true`
- When the agent produces an action (email send, API call, data modification), pause the run
- Create a waitpoint token, store it, send notification to the user
- User approves/rejects via dashboard UI
- Run resumes or aborts based on approval

### R4: Per-User Concurrency & Priority
- Use Trigger.dev concurrency keys: `concurrencyKey: userId`
- Free tier: 1 concurrent agent run
- Pro tier: 5 concurrent agent runs
- Enterprise: configurable
- Priority queuing: paid users execute before free tier (Trigger.dev run priority)

### R5: Realtime Progress Streaming
- Use Trigger.dev's realtime streaming to push step progress to the frontend
- Dashboard shows: current step, elapsed time, token usage, intermediate outputs
- Support for SSE or WebSocket delivery to React frontend

### R6: Observability
- Every run produces structured logs visible in Trigger.dev dashboard
- Step durations, token counts, error details, retry counts
- Export metrics for the Agent Forge analytics dashboard

### R7: Self-Hosting Support
- Trigger.dev must be self-hostable via Docker Compose for enterprise customers
- Include Trigger.dev services in Agent Forge's existing `docker-compose.yml`
- Cloud free tier for development and starter plan customers

## Technical Design

### New Files (TypeScript — Trigger.dev worker)
```
src/trigger/
├── client.ts           # Trigger.dev client config
├── tasks/
│   ├── run-agent.ts    # Main agent execution task (schemaTask)
│   ├── run-tool.ts     # Tool execution sub-task
│   └── ingest-knowledge.ts  # Knowledge base ingestion task
├── utils/
│   ├── llm.ts          # LLM call wrapper (Claude + OpenAI)
│   └── supabase.ts     # Supabase client for task context
└── trigger.config.ts   # Trigger.dev project config
```

### Integration Points
- **API Route:** `app/api/agents/run/route.ts` — triggers agent run via Trigger.dev SDK
- **API Route:** `app/api/agents/run/[runId]/route.ts` — get run status
- **API Route:** `app/api/agents/run/[runId]/approve/route.ts` — approve/reject waitpoint
- **Dashboard Component:** Real-time run viewer using `@trigger.dev/react-hooks`
- **Webhook:** Trigger.dev → Agent Forge webhook for run completion notifications

### Dependencies to Add
```json
{
  "@trigger.dev/sdk": "^4.0.0",
  "@trigger.dev/react-hooks": "^4.0.0"
}
```

## Acceptance Criteria
1. ✅ Agent run survives server restart (kill process mid-run, run resumes)
2. ✅ Failed LLM call retries from the failed step, not from scratch
3. ✅ Agent with `requiresApproval: true` pauses and waits for user action
4. ✅ Free users limited to 1 concurrent run, pro to 5
5. ✅ Dashboard shows real-time step progress during agent execution
6. ✅ Docker Compose includes Trigger.dev services for self-hosted deployment
7. ✅ Existing Python backend functionality unaffected

## Out of Scope (Phase 1)
- Migrating marketing/sales/support engines to Trigger.dev (future phase)
- Voice agent execution (stays in LiveKit pipeline)
- Knowledge base RAG pipeline (phase 2 candidate)

## Timeline
- **Week 1:** Trigger.dev setup, client config, basic `run-agent` task with 3 steps
- **Week 2:** Waitpoints, concurrency, priority queuing
- **Week 3:** Real-time streaming, dashboard integration
- **Week 4:** Docker Compose self-host, testing, polish
