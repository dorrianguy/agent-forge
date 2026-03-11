---
name: agent-forge-create
description: Scaffold and deploy a production-ready AI agent using Agent Forge. Describe what you want in plain English and get a complete, deployable agent.
version: 1.0.0
author: dorrianguy
tags: [ai-agents, no-code, claude, deployment, automation]
---

# agent-forge-create

Scaffold and deploy a production-ready AI agent using [Agent Forge](https://agent-forge.app). Describe what you want in plain English — Agent Forge generates the agent, system prompt, and deployment config automatically.

## What It Does

- Takes a natural language description of an AI agent
- Generates production-ready agent code (Python/Node.js)
- Creates optimized system prompts
- Configures deployment to Cloudflare Workers, Vercel, AWS Lambda, Railway, or Docker
- Produces an embeddable widget + REST API endpoint

## Usage

### Step 1: Describe your agent

Tell your AI assistant what kind of agent you need:

```
Create an AI agent that:
- Handles customer support for a SaaS product
- Knows our pricing tiers and FAQs
- Escalates to humans when frustrated
- Logs all conversations
```

### Step 2: Use agent-forge-create

The skill calls the Agent Forge API to scaffold your agent:

```bash
# Via Agent Forge CLI (after npm install -g agent-forge-cli)
agent-forge create --description "your agent description" --name "my-support-agent"

# Or via the Agent Forge dashboard
open https://agent-forge.app
```

### Step 3: Deploy

Agent Forge generates a one-click deploy config. Choose your platform:

```bash
# Cloudflare Workers
agent-forge deploy --platform cloudflare

# Vercel
agent-forge deploy --platform vercel

# Docker
agent-forge deploy --platform docker
```

## Output

After creation, you receive:
- `agent.py` or `agent.ts` — production-ready agent code
- `system-prompt.md` — optimized prompt for your use case
- `deploy.config.json` — platform-specific deployment config
- Embeddable `<script>` widget for your website
- REST API endpoint: `POST /api/agent/chat`

## Agent Types Supported

| Type | Use Case |
|------|----------|
| Customer Support | FAQ handling, ticket routing, escalation |
| Sales | Lead qualification, product demos, follow-up |
| Voice Agent | LiveKit-powered voice conversations |
| Coding Assistant | Code review, generation, debugging |
| Data Analyst | Query data, generate reports, surface insights |
| Custom | Any use case described in plain English |

## Requirements

- Agent Forge account: [agent-forge.app](https://agent-forge.app)
- `ANTHROPIC_API_KEY` for Claude-powered agents
- Optional: platform CLI for one-click deploy

## Links

- Dashboard: [agent-forge.app](https://agent-forge.app)
- Docs: [agent-forge.app/docs](https://agent-forge.app/docs)
- GitHub: [github.com/dorrianguy/agent-forge](https://github.com/dorrianguy/agent-forge)
