# 🔥 Agent Forge

**Build AI Agents Without Code**

Agent Forge is a fully autonomous AI agent builder platform. Describe what you want, and it creates a complete, production-ready AI agent that you can deploy anywhere.

---

## ✨ Features

### 🤖 Universal Agent Builder
- Build ANY type of AI agent from natural language descriptions
- Customer support, sales, lead qualification, FAQ bots, and more
- Generates production-ready Python code automatically
- Creates optimized system prompts

### 🚀 One-Click Deployment
- Deploy to Cloudflare Workers, Vercel, AWS Lambda, Railway, or Docker
- Automatic configuration and setup
- Embeddable widgets for any website
- API endpoints ready to use

### 📊 Autonomous Operations
- AI-powered marketing content generation
- Automated lead qualification and sales conversations
- 24/7 customer support automation
- Self-learning and improving agents

### 💼 Business Ready
- Subscription billing system
- Analytics dashboard
- Multi-tenant architecture
- Enterprise-grade security

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/dorrianguy/agent-forge.git
cd agent-forge

# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start with Docker
docker-compose up -d

# Access the dashboard
open http://localhost:8000
```

### Option 2: Manual Setup

```bash
# Clone the repository
git clone https://github.com/dorrianguy/agent-forge.git
cd agent-forge

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run the orchestrator
python -m backend.orchestrator
```

---

## 📁 Project Structure

```
agent-forge/
├── backend/
│   ├── __init__.py
│   ├── orchestrator.py      # Main automation engine
│   ├── universal_builder.py # AI agent builder
│   └── deployment.py        # Deployment manager
├── src/
│   └── AgentForgeDashboard.jsx  # React dashboard
├── public/
│   └── index.html           # HTML entry point
├── config.json              # Configuration
├── requirements.txt         # Python dependencies
├── package.json            # Node dependencies
├── Dockerfile              # Docker image
├── docker-compose.yml      # Docker Compose
├── .env.example            # Environment template
└── README.md               # This file
```

---

## 🛠️ Creating an Agent

### Via the Dashboard

1. Open the Agent Forge dashboard
2. Click "Create Agent"
3. Describe what you want:
   ```
   I need a customer support agent for my SaaS product.
   It should answer questions about pricing, help with
   troubleshooting, and escalate complex issues.
   ```
4. Click "Forge Agent"
5. Deploy to your preferred platform

### Via the API

```python
from backend import UniversalAgentBuilder

builder = UniversalAgentBuilder()

agent = await builder.build_agent(
    description="A sales assistant that qualifies leads and books demos",
    requirements=["Multi-language support", "CRM integration"],
    company_info={
        "name": "My Company",
        "products": ["Basic $29/mo", "Pro $99/mo"]
    }
)

print(f"Agent created: {agent.spec.name}")
print(f"Embed code: {agent.embed_code}")
```

### Via CLI

```bash
python -m backend.universal_builder
```

---

## 🌐 Deployment Options

### Cloudflare Workers
```bash
# Set credentials in .env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Deploy
python -c "
from backend import DeploymentManager
import asyncio

dm = DeploymentManager()
deployment = asyncio.run(dm.deploy('agent-id', 'cloudflare'))
print(f'Deployed to: {deployment.url}')
"
```

### Vercel
```bash
# Set credentials in .env
VERCEL_TOKEN=your_token

# Deploy
python -c "
from backend import DeploymentManager
import asyncio

dm = DeploymentManager()
deployment = asyncio.run(dm.deploy('agent-id', 'vercel'))
print(f'Deployed to: {deployment.url}')
"
```

### Docker
```bash
# Export package
python -c "
from backend import DeploymentManager

dm = DeploymentManager()
zip_path = dm.export_package('agent-id', 'docker', './exports')
print(f'Package exported to: {zip_path}')
"

# Build and run
cd exports
unzip agent-*.zip
docker build -t my-agent .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=your_key my-agent
```

---

## 📊 Configuration

Edit `config.json` to customize:

```json
{
  "business": {
    "name": "Agent Forge",
    "tagline": "Build AI Agents Without Code"
  },
  "pricing": {
    "plans": {
      "starter": { "price": 49, "agents": 1 },
      "professional": { "price": 149, "agents": 5 },
      "enterprise": { "price": 499, "agents": -1 }
    }
  },
  "ai": {
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1000
  }
}
```

---

## 🔌 Integrations

Agent Forge supports:
- **Messaging**: Slack, Discord, WhatsApp
- **CRM**: Salesforce, HubSpot
- **Support**: Zendesk, Intercom
- **Automation**: Zapier, Make
- **Custom**: Any REST API

---

## 📈 Analytics

The dashboard provides:
- Total conversations
- Response times
- Satisfaction scores
- Conversion rates
- Message volume trends

---

## 🔒 Security

- All data encrypted at rest and in transit
- API key authentication
- Rate limiting
- SOC 2 compliant architecture
- GDPR ready

---

## 🌐 Links

- **Website**: [agent-forge.app](https://agent-forge.app)
- **Features**: [agent-forge.app/features](https://agent-forge.app/features)
- **Pricing**: [agent-forge.app/pricing](https://agent-forge.app/pricing)
- **Documentation**: [agent-forge.app/docs](https://agent-forge.app/docs)
- **Blog**: [agent-forge.app/blog](https://agent-forge.app/blog)
- **FAQ**: [agent-forge.app/faq](https://agent-forge.app/faq)
- **Comparisons**: [agent-forge.app/compare](https://agent-forge.app/compare)
- **Email**: support@agent-forge.app

---

## 🤝 Support

- Documentation: [agent-forge.app/docs](https://agent-forge.app/docs)
- Email: support@agent-forge.app

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [Anthropic Claude](https://anthropic.com) - AI backbone
- [Next.js](https://nextjs.org) - Full-stack React framework
- [React](https://react.dev) - Frontend
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Supabase](https://supabase.com) - Auth & Database

---

**[Start building your AI agent for free →](https://agent-forge.app/build)**
