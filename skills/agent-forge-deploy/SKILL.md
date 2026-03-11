---
name: agent-forge-deploy
description: Deploy Agent Forge agents to Cloudflare Workers, Vercel, AWS Lambda, Railway, or Docker with a single command. Handles build, env vars, CDN routing, and zero-downtime rollouts automatically.
version: 1.0.0
author: dorrianguy
tags: [deployment, cloudflare, vercel, aws, docker, ci-cd, devops]
---

# agent-forge-deploy

Deploy your Agent Forge agents to production with a single command. Handles platform-specific build config, environment variable injection, CDN routing, and zero-downtime rollouts — no DevOps expertise required.

## What It Does

- Builds and deploys agents to your chosen platform
- Injects environment variables securely (no `.env` in production)
- Configures custom domains and SSL automatically
- Sets up health checks and auto-restart policies
- Provides rollback to previous version in one command
- Generates deployment receipts with URLs and version tags

## Usage

### Step 1: Choose your platform

```bash
# See available platforms
agent-forge deploy --list-platforms
```

| Platform | Best For | Cold Start | Free Tier |
|----------|----------|------------|-----------|
| Cloudflare Workers | Edge latency, global | ~0ms | 100k req/day |
| Vercel | Next.js, serverless | ~50ms | Generous |
| AWS Lambda | Enterprise scale | ~100ms | 1M req/month |
| Railway | Full backend, persistent | None | $5 credit |
| Docker | Self-hosted, full control | None | Self-managed |

### Step 2: Deploy

```bash
# Cloudflare Workers (recommended — fastest globally)
agent-forge deploy --platform cloudflare --agent my-support-agent

# Vercel
agent-forge deploy --platform vercel --agent my-support-agent

# Railway
agent-forge deploy --platform railway --agent my-support-agent

# Docker (generates Dockerfile + docker-compose.yml)
agent-forge deploy --platform docker --agent my-support-agent
```

### Step 3: Set environment variables

```bash
# Set secrets securely (never stored in code)
agent-forge env set ANTHROPIC_API_KEY=sk-ant-...
agent-forge env set OPENAI_API_KEY=sk-...
agent-forge env set SUPABASE_URL=https://...
```

### Step 4: Configure custom domain (optional)

```bash
agent-forge deploy domain add my-agent.company.com
# Agent Forge provisions SSL and configures DNS automatically
```

### Step 5: Verify

```bash
agent-forge deploy status
# Output: ✅ Deployed to https://my-agent.company.workers.dev
#         ✅ Health check: 200 OK (45ms)
#         ✅ Custom domain: my-agent.company.com
#         ✅ SSL: valid until 2027-03-11
```

## Platform-Specific Details

### Cloudflare Workers

Zero cold start, runs at the edge in 300+ cities globally.

```bash
agent-forge deploy --platform cloudflare
# Generates:
#   wrangler.toml
#   dist/worker.js (bundled with esbuild)
# Deploys via: wrangler publish
```

Limits: 128MB memory, 10ms CPU per request (use Durable Objects for stateful agents).

### Vercel

Best for agents that need Next.js API routes or Vercel's AI SDK integrations.

```bash
agent-forge deploy --platform vercel
# Generates:
#   vercel.json
#   api/agent/chat.ts
# Deploys via: vercel --prod
```

### Railway

Best for agents that need persistent processes, WebSocket connections, or background jobs.

```bash
agent-forge deploy --platform railway
# Generates:
#   railway.toml
#   Procfile
# Deploys via: railway up
```

### Docker

Generate a production-ready Docker setup for self-hosted deployments.

```bash
agent-forge deploy --platform docker
# Generates:
#   Dockerfile
#   docker-compose.yml
#   .dockerignore
# Run locally: docker compose up -d
# Push to registry: docker buildx build --push -t registry.io/my-agent:latest .
```

## CI/CD Integration

Agent Forge generates GitHub Actions workflows for automated deploys:

```bash
agent-forge deploy ci --platform cloudflare
# Creates: .github/workflows/deploy.yml
```

Generated workflow:
```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: agent-forge/deploy-action@v1
        with:
          agent-id: my-support-agent
          platform: cloudflare
          api-key: ${{ secrets.AGENT_FORGE_API_KEY }}
```

## Rollback

```bash
# List recent deployments
agent-forge deploy history

# Roll back to previous version
agent-forge deploy rollback --to v1.2.3
```

## Output

After deployment you receive:
- Production URL (e.g., `https://my-agent.company.workers.dev`)
- REST API: `POST /api/agent/chat`
- Embeddable widget: `<script src="..." data-agent-id="..."></script>`
- Deployment receipt: `deploy-receipt-[timestamp].json`
- Health check URL: `/health`

## Requirements

- Agent Forge account: [agent-forge.app](https://agent-forge.app)
- `AGENT_FORGE_API_KEY` environment variable
- Platform CLI (auto-installed if missing):
  - Cloudflare: `wrangler`
  - Vercel: `vercel`
  - Railway: `railway`
  - Docker: `docker`
- `ANTHROPIC_API_KEY` for Claude-powered agents

## Links

- Dashboard: [agent-forge.app](https://agent-forge.app)
- Deploy docs: [agent-forge.app/docs/deploy](https://agent-forge.app/docs/deploy)
- GitHub: [github.com/dorrianguy/agent-forge](https://github.com/dorrianguy/agent-forge)
