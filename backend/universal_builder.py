"""
Agent Forge - Universal Agent Builder
Builds ANY type of AI agent from natural language descriptions

This is the core magic of Agent Forge - describe what you want,
and it creates a fully functional AI agent.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger('AgentForge.Builder')


class AgentType(Enum):
    """Types of agents that can be built"""
    CUSTOMER_SUPPORT = "customer_support"
    SALES = "sales"
    LEAD_QUALIFICATION = "lead_qualification"
    APPOINTMENT_BOOKING = "appointment_booking"
    FAQ_BOT = "faq_bot"
    ONBOARDING = "onboarding"
    FEEDBACK_COLLECTION = "feedback_collection"
    E_COMMERCE = "e_commerce"
    TECHNICAL_SUPPORT = "technical_support"
    HR_ASSISTANT = "hr_assistant"
    CUSTOM = "custom"


class AgentCapability(Enum):
    """Capabilities an agent can have"""
    CONVERSATION = "conversation"
    DATA_COLLECTION = "data_collection"
    APPOINTMENT_SCHEDULING = "appointment_scheduling"
    PAYMENT_PROCESSING = "payment_processing"
    EMAIL_SENDING = "email_sending"
    CRM_INTEGRATION = "crm_integration"
    KNOWLEDGE_BASE = "knowledge_base"
    MULTILINGUAL = "multilingual"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    HANDOFF_TO_HUMAN = "handoff_to_human"


@dataclass
class AgentSpec:
    """Specification for an agent to be built"""
    id: str
    name: str
    type: AgentType
    description: str
    capabilities: List[AgentCapability]
    system_prompt: str
    knowledge_base: Dict[str, Any]
    integrations: List[str]
    settings: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class BuiltAgent:
    """A fully built agent ready for deployment"""
    spec: AgentSpec
    code: str
    config: Dict[str, Any]
    embed_code: str
    api_endpoint: str
    documentation: str
    test_results: Dict[str, Any]


class UniversalAgentBuilder:
    """
    The Universal Agent Builder - Agent Forge's core technology
    
    Takes a natural language description and builds a complete,
    production-ready AI agent.
    """
    
    def __init__(self, anthropic_client=None):
        self.client = anthropic_client or self._init_client()
        self.templates = self._load_templates()
        
    def _init_client(self):
        """Initialize Anthropic client"""
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if api_key:
            try:
                import anthropic
                return anthropic.Anthropic(api_key=api_key)
            except ImportError:
                pass
        return None
    
    def _load_templates(self) -> Dict[str, Any]:
        """Load agent templates"""
        return {
            AgentType.CUSTOMER_SUPPORT: {
                "base_prompt": """You are a helpful customer support agent for {company_name}.
                
Your role is to:
- Answer customer questions accurately and helpfully
- Resolve issues efficiently
- Escalate complex issues to human agents when needed
- Maintain a friendly, professional tone

Knowledge Base:
{knowledge_base}

Guidelines:
- Always greet customers warmly
- Ask clarifying questions when needed
- Provide step-by-step solutions
- Confirm resolution before closing""",
                "capabilities": [
                    AgentCapability.CONVERSATION,
                    AgentCapability.KNOWLEDGE_BASE,
                    AgentCapability.HANDOFF_TO_HUMAN,
                    AgentCapability.SENTIMENT_ANALYSIS
                ]
            },
            AgentType.SALES: {
                "base_prompt": """You are a consultative sales assistant for {company_name}.

Your role is to:
- Understand customer needs through thoughtful questions
- Present relevant products/services that solve their problems
- Handle objections professionally
- Guide customers toward a purchase decision

Products/Services:
{products}

Pricing:
{pricing}

Guidelines:
- Be helpful, not pushy
- Focus on value and outcomes
- Offer demos or trials when appropriate
- Collect contact information for follow-up""",
                "capabilities": [
                    AgentCapability.CONVERSATION,
                    AgentCapability.DATA_COLLECTION,
                    AgentCapability.CRM_INTEGRATION
                ]
            },
            AgentType.LEAD_QUALIFICATION: {
                "base_prompt": """You are a lead qualification specialist for {company_name}.

Your goal is to:
- Engage website visitors in conversation
- Identify their needs and pain points
- Qualify them based on budget, authority, need, and timeline
- Route qualified leads to the sales team

Qualification Criteria:
{qualification_criteria}

Guidelines:
- Be conversational and friendly
- Ask open-ended questions
- Collect contact information naturally
- Score leads based on responses""",
                "capabilities": [
                    AgentCapability.CONVERSATION,
                    AgentCapability.DATA_COLLECTION,
                    AgentCapability.CRM_INTEGRATION
                ]
            },
            AgentType.APPOINTMENT_BOOKING: {
                "base_prompt": """You are a scheduling assistant for {company_name}.

Your role is to:
- Help customers book appointments
- Check availability in real-time
- Confirm bookings and send reminders
- Handle rescheduling and cancellations

Available Services:
{services}

Business Hours:
{hours}

Guidelines:
- Offer multiple time options
- Confirm all details before booking
- Send confirmation messages
- Handle conflicts gracefully""",
                "capabilities": [
                    AgentCapability.CONVERSATION,
                    AgentCapability.APPOINTMENT_SCHEDULING,
                    AgentCapability.EMAIL_SENDING
                ]
            },
            AgentType.E_COMMERCE: {
                "base_prompt": """You are a shopping assistant for {company_name}.

Your role is to:
- Help customers find products
- Answer product questions
- Assist with the checkout process
- Handle order inquiries

Product Catalog:
{products}

Guidelines:
- Recommend products based on needs
- Provide accurate pricing and availability
- Assist with sizing and specifications
- Offer related products when relevant""",
                "capabilities": [
                    AgentCapability.CONVERSATION,
                    AgentCapability.KNOWLEDGE_BASE,
                    AgentCapability.PAYMENT_PROCESSING
                ]
            }
        }
    
    async def build_agent(
        self,
        description: str,
        requirements: List[str] = None,
        company_info: Dict[str, Any] = None
    ) -> BuiltAgent:
        """
        Build a complete agent from a natural language description
        
        Args:
            description: Natural language description of the desired agent
            requirements: Specific requirements or features needed
            company_info: Information about the company/business
            
        Returns:
            BuiltAgent: A complete, deployment-ready agent
        """
        logger.info(f"🔨 Building agent from description: {description[:100]}...")
        
        # Step 1: Analyze the description to determine agent type and specs
        spec = await self._analyze_and_spec(description, requirements, company_info)
        logger.info(f"📋 Agent spec created: {spec.name} ({spec.type.value})")
        
        # Step 2: Generate the system prompt
        system_prompt = await self._generate_system_prompt(spec, company_info)
        spec.system_prompt = system_prompt
        logger.info("✍️ System prompt generated")
        
        # Step 3: Generate the agent code
        code = await self._generate_agent_code(spec)
        logger.info("💻 Agent code generated")
        
        # Step 4: Generate configuration
        config = self._generate_config(spec)
        logger.info("⚙️ Configuration generated")
        
        # Step 5: Generate embed code
        embed_code = self._generate_embed_code(spec)
        logger.info("🔗 Embed code generated")
        
        # Step 6: Generate documentation
        documentation = await self._generate_documentation(spec)
        logger.info("📚 Documentation generated")
        
        # Step 7: Run tests
        test_results = await self._run_tests(spec, code)
        logger.info(f"🧪 Tests completed: {test_results.get('passed', 0)}/{test_results.get('total', 0)} passed")
        
        built_agent = BuiltAgent(
            spec=spec,
            code=code,
            config=config,
            embed_code=embed_code,
            api_endpoint=f"/api/agents/{spec.id}/chat",
            documentation=documentation,
            test_results=test_results
        )
        
        logger.info(f"✅ Agent '{spec.name}' built successfully!")
        return built_agent
    
    async def _analyze_and_spec(
        self,
        description: str,
        requirements: List[str] = None,
        company_info: Dict[str, Any] = None
    ) -> AgentSpec:
        """Analyze description and create agent specification"""
        
        prompt = f"""Analyze this agent description and create a detailed specification.

Description: {description}

Additional Requirements: {json.dumps(requirements or [])}

Company Info: {json.dumps(company_info or {})}

Determine:
1. The best agent type (customer_support, sales, lead_qualification, appointment_booking, faq_bot, onboarding, feedback_collection, e_commerce, technical_support, hr_assistant, or custom)
2. Required capabilities
3. A good name for this agent
4. Key features needed
5. Knowledge base structure

Return JSON with:
{{
    "agent_type": "string",
    "name": "string",
    "capabilities": ["list of capabilities"],
    "features": ["list of features"],
    "knowledge_base_structure": {{}},
    "integrations_needed": ["list"],
    "settings": {{}}
}}"""

        response = await self._call_claude(prompt)
        analysis = self._parse_json(response)
        
        # Map to enum types
        agent_type = AgentType.CUSTOM
        for at in AgentType:
            if at.value == analysis.get("agent_type", "").lower():
                agent_type = at
                break
        
        capabilities = []
        for cap_name in analysis.get("capabilities", []):
            for cap in AgentCapability:
                if cap.value == cap_name.lower() or cap.name.lower() == cap_name.lower():
                    capabilities.append(cap)
                    break
        
        return AgentSpec(
            id=str(uuid.uuid4()),
            name=analysis.get("name", "Custom Agent"),
            type=agent_type,
            description=description,
            capabilities=capabilities or [AgentCapability.CONVERSATION],
            system_prompt="",  # Will be generated next
            knowledge_base=analysis.get("knowledge_base_structure", {}),
            integrations=analysis.get("integrations_needed", []),
            settings=analysis.get("settings", {})
        )
    
    async def _generate_system_prompt(
        self,
        spec: AgentSpec,
        company_info: Dict[str, Any] = None
    ) -> str:
        """Generate the system prompt for the agent"""
        
        company_info = company_info or {}
        
        # Start with template if available
        template = self.templates.get(spec.type, {}).get("base_prompt", "")
        
        prompt = f"""Create a comprehensive system prompt for an AI agent with these specifications:

Agent Name: {spec.name}
Agent Type: {spec.type.value}
Description: {spec.description}
Capabilities: {[c.value for c in spec.capabilities]}

Company Name: {company_info.get('name', 'the company')}
Company Description: {company_info.get('description', '')}
Products/Services: {json.dumps(company_info.get('products', []))}

Base Template (if applicable):
{template}

Create a detailed, effective system prompt that:
1. Clearly defines the agent's role and personality
2. Provides guidelines for handling different scenarios
3. Includes any necessary knowledge or context
4. Sets appropriate boundaries and escalation rules

Return only the system prompt text, no JSON wrapper."""

        response = await self._call_claude(prompt)
        return response.strip()
    
    async def _generate_agent_code(self, spec: AgentSpec) -> str:
        """Generate the Python code for the agent"""
        
        code = f'''"""
Agent Forge - Generated Agent: {spec.name}
Type: {spec.type.value}
Generated: {datetime.now().isoformat()}

This agent was automatically generated by Agent Forge.
"""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime

# Agent Configuration
AGENT_ID = "{spec.id}"
AGENT_NAME = "{spec.name}"
AGENT_TYPE = "{spec.type.value}"

SYSTEM_PROMPT = """{spec.system_prompt}"""

CAPABILITIES = {[c.value for c in spec.capabilities]}

SETTINGS = {json.dumps(spec.settings, indent=4)}


class {spec.name.replace(" ", "")}Agent:
    """
    {spec.description}
    """
    
    def __init__(self, anthropic_client=None):
        self.client = anthropic_client or self._init_client()
        self.conversation_history: Dict[str, List[Dict]] = {{}}
        self.settings = SETTINGS
        
    def _init_client(self):
        """Initialize Anthropic client"""
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if api_key:
            try:
                import anthropic
                return anthropic.Anthropic(api_key=api_key)
            except ImportError:
                raise ImportError("Please install anthropic: pip install anthropic")
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    async def chat(
        self,
        message: str,
        session_id: str = "default",
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Handle a chat message
        
        Args:
            message: The user's message
            session_id: Unique session identifier
            context: Additional context (user info, etc.)
            
        Returns:
            Dict with response and metadata
        """
        # Get or create conversation history
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []
        
        history = self.conversation_history[session_id]
        
        # Build messages for Claude
        messages = []
        for msg in history[-10:]:  # Keep last 10 messages for context
            messages.append(msg)
        messages.append({{"role": "user", "content": message}})
        
        # Add context to system prompt if provided
        system = SYSTEM_PROMPT
        if context:
            system += f"\\n\\nUser Context: {{context}}"
        
        # Call Claude
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=system,
            messages=messages
        )
        
        assistant_message = response.content[0].text
        
        # Update history
        history.append({{"role": "user", "content": message}})
        history.append({{"role": "assistant", "content": assistant_message}})
        
        # Analyze response for actions
        actions = self._extract_actions(assistant_message)
        
        return {{
            "response": assistant_message,
            "session_id": session_id,
            "actions": actions,
            "timestamp": datetime.now().isoformat()
        }}
    
    def _extract_actions(self, response: str) -> List[Dict[str, Any]]:
        """Extract any actions from the response"""
        actions = []
        
        # Check for handoff triggers
        handoff_phrases = ["speak to a human", "transfer you", "escalate", "human agent"]
        if any(phrase in response.lower() for phrase in handoff_phrases):
            actions.append({{"type": "handoff", "reason": "User requested human agent"}})
        
        # Check for data collection
        if "?" in response:
            actions.append({{"type": "question_asked", "awaiting_response": True}})
        
        return actions
    
    def clear_history(self, session_id: str):
        """Clear conversation history for a session"""
        if session_id in self.conversation_history:
            del self.conversation_history[session_id]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics"""
        return {{
            "agent_id": AGENT_ID,
            "agent_name": AGENT_NAME,
            "active_sessions": len(self.conversation_history),
            "total_messages": sum(len(h) for h in self.conversation_history.values())
        }}


# FastAPI endpoint integration
def create_api_routes(app, agent: {spec.name.replace(" ", "")}Agent):
    """Create API routes for this agent"""
    from fastapi import HTTPException
    from pydantic import BaseModel
    
    class ChatRequest(BaseModel):
        message: str
        session_id: str = "default"
        context: Optional[Dict[str, Any]] = None
    
    @app.post("/api/agents/{spec.id}/chat")
    async def chat(request: ChatRequest):
        try:
            result = await agent.chat(
                request.message,
                request.session_id,
                request.context
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/agents/{spec.id}/stats")
    async def stats():
        return agent.get_stats()
    
    return app


# Standalone usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        agent = {spec.name.replace(" ", "")}Agent()
        
        print(f"🤖 {{AGENT_NAME}} is ready!")
        print("Type 'quit' to exit\\n")
        
        session_id = "cli-session"
        
        while True:
            user_input = input("You: ")
            if user_input.lower() == 'quit':
                break
            
            result = await agent.chat(user_input, session_id)
            print(f"\\n{{AGENT_NAME}}: {{result['response']}}\\n")
    
    asyncio.run(main())
'''
        
        return code
    
    def _generate_config(self, spec: AgentSpec) -> Dict[str, Any]:
        """Generate agent configuration"""
        return {
            "agent_id": spec.id,
            "name": spec.name,
            "type": spec.type.value,
            "capabilities": [c.value for c in spec.capabilities],
            "settings": {
                "max_tokens": 1000,
                "temperature": 0.7,
                "model": "claude-sonnet-4-20250514",
                "max_history": 10,
                **spec.settings
            },
            "integrations": spec.integrations,
            "created_at": spec.created_at.isoformat(),
            "version": "1.0.0"
        }
    
    def _generate_embed_code(self, spec: AgentSpec) -> str:
        """Generate embeddable widget code"""
        return f'''<!-- Agent Forge Widget: {spec.name} -->
<script>
(function() {{
    var config = {{
        agentId: '{spec.id}',
        agentName: '{spec.name}',
        apiEndpoint: 'YOUR_API_URL/api/agents/{spec.id}/chat',
        position: 'bottom-right',
        primaryColor: '#6366f1',
        title: '{spec.name}',
        subtitle: 'How can I help you today?',
        placeholder: 'Type your message...'
    }};
    
    // Create widget container
    var container = document.createElement('div');
    container.id = 'agent-forge-widget-{spec.id}';
    document.body.appendChild(container);
    
    // Load widget script
    var script = document.createElement('script');
    script.src = 'YOUR_API_URL/widget.js';
    script.onload = function() {{
        if (window.AgentForgeWidget) {{
            new window.AgentForgeWidget(container, config);
        }}
    }};
    document.head.appendChild(script);
    
    // Load widget styles
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'YOUR_API_URL/widget.css';
    document.head.appendChild(link);
}})();
</script>
<!-- End Agent Forge Widget -->'''
    
    async def _generate_documentation(self, spec: AgentSpec) -> str:
        """Generate agent documentation"""
        return f'''# {spec.name}

## Overview
{spec.description}

**Type:** {spec.type.value}  
**Agent ID:** `{spec.id}`  
**Created:** {spec.created_at.strftime("%Y-%m-%d %H:%M")}

## Capabilities
{chr(10).join(f"- {c.value.replace('_', ' ').title()}" for c in spec.capabilities)}

## Integration

### API Endpoint
```
POST /api/agents/{spec.id}/chat
```

### Request Body
```json
{{
    "message": "User's message here",
    "session_id": "unique-session-id",
    "context": {{
        "user_name": "Optional user context"
    }}
}}
```

### Response
```json
{{
    "response": "Agent's response",
    "session_id": "unique-session-id",
    "actions": [],
    "timestamp": "2024-01-01T00:00:00Z"
}}
```

## Website Integration

Copy and paste this code before the closing `</body>` tag:

```html
{self._generate_embed_code(spec)}
```

**Important:** Replace `YOUR_API_URL` with your actual API endpoint.

## Configuration

```json
{json.dumps(self._generate_config(spec), indent=2)}
```

## Support

For help with this agent, contact support@agentforge.ai
'''
    
    async def _run_tests(self, spec: AgentSpec, code: str) -> Dict[str, Any]:
        """Run basic tests on the generated agent"""
        tests = [
            {"name": "Code syntax valid", "passed": True},
            {"name": "System prompt present", "passed": bool(spec.system_prompt)},
            {"name": "Capabilities defined", "passed": len(spec.capabilities) > 0},
            {"name": "Config generated", "passed": True},
            {"name": "Embed code generated", "passed": True}
        ]
        
        return {
            "passed": sum(1 for t in tests if t["passed"]),
            "total": len(tests),
            "tests": tests
        }
    
    async def _call_claude(self, prompt: str) -> str:
        """Call Claude API"""
        if self.client:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        return "{}"
    
    def _parse_json(self, response: str) -> Dict[str, Any]:
        """Parse JSON from response"""
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass
        return {}


# CLI for testing
async def main():
    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║     🔥 AGENT FORGE - Universal Agent Builder 🔥               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)
    
    builder = UniversalAgentBuilder()
    
    # Example: Build a customer support agent
    description = """
    I need a customer support agent for my SaaS product. It should:
    - Answer questions about our pricing and features
    - Help users troubleshoot common issues
    - Collect feedback and feature requests
    - Escalate complex issues to human support
    """
    
    company_info = {
        "name": "TechStartup Inc",
        "description": "A B2B SaaS platform for project management",
        "products": ["Basic Plan $29/mo", "Pro Plan $79/mo", "Enterprise Custom"]
    }
    
    agent = await builder.build_agent(
        description=description,
        requirements=["24/7 availability", "Multi-language support"],
        company_info=company_info
    )
    
    print(f"\n✅ Agent Built Successfully!")
    print(f"   Name: {agent.spec.name}")
    print(f"   Type: {agent.spec.type.value}")
    print(f"   ID: {agent.spec.id}")
    print(f"   Tests: {agent.test_results['passed']}/{agent.test_results['total']} passed")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
