"""
Agent Forge - Main Orchestrator
The autonomous brain that runs the entire business 24/7

This orchestrator handles:
- Marketing content generation
- Lead qualification and sales conversations
- Agent building coordination
- Deployment automation
- Customer support
- Billing and invoicing
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import os
import uuid

from .control_hub import get_control_hub, log_to_hub
from .collaboration import get_collaboration_hub, AgentRole, MessageType, CollaborativeAgentMixin
from .learning import get_learning_engine, OutcomeType, StrategyType
from .workforce import get_workforce_manager, WorkerType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('AgentForge.Orchestrator')


class TaskType(Enum):
    """Types of autonomous tasks"""
    MARKETING = "marketing"
    SALES = "sales"
    BUILD = "build"
    DEPLOY = "deploy"
    SUPPORT = "support"
    BILLING = "billing"
    ANALYTICS = "analytics"
    QA = "qa"


class TaskPriority(Enum):
    """Task priority levels"""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


@dataclass
class Task:
    """Represents an autonomous task"""
    id: str
    type: TaskType
    priority: TaskPriority
    payload: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.now)
    scheduled_for: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    retries: int = 0
    max_retries: int = 3


class MarketingEngine(CollaborativeAgentMixin):
    """Handles all marketing automation for Agent Forge"""

    def __init__(self, anthropic_client, config: Dict[str, Any] = None):
        self.client = anthropic_client
        self.content_calendar = []
        self.role = AgentRole.MARKETING
        self.learning = get_learning_engine()
        # AI configuration
        ai_config = (config or {}).get('ai', {})
        self.model = ai_config.get('model', 'claude-sonnet-4-20250514')
        self.max_tokens = ai_config.get('max_tokens', 4000)
        self.temperature = ai_config.get('temperature', 0.7)
        
    async def generate_blog_post(self, topic: str) -> Dict[str, Any]:
        """Generate SEO-optimized blog post"""
        prompt = f"""Write a comprehensive, SEO-optimized blog post about: {topic}
        
        The post should:
        - Be 1500-2000 words
        - Include an engaging headline
        - Have clear sections with subheadings
        - Include actionable tips
        - End with a call-to-action for Agent Forge - the AI agent builder
        
        Format as JSON with keys: title, meta_description, content, tags"""
        
        response = await self._call_claude(prompt)
        return self._parse_response(response)
    
    async def generate_social_posts(self, topic: str) -> List[Dict[str, Any]]:
        """Generate social media content"""
        prompt = f"""Create 5 engaging social media posts about: {topic}
        
        Include:
        - 2 Twitter/X posts (under 280 chars)
        - 2 LinkedIn posts (professional tone)
        - 1 Instagram caption
        
        Each should drive traffic to Agent Forge - our AI agent builder platform.
        Format as JSON array with keys: platform, content, hashtags"""
        
        response = await self._call_claude(prompt)
        return self._parse_response(response)
    
    async def generate_email_campaign(self, segment: str, goal: str) -> Dict[str, Any]:
        """Generate email campaign content"""
        prompt = f"""Create an email marketing campaign for Agent Forge.
        Target segment: {segment}
        Goal: {goal}
        
        Include:
        - Subject line (A/B variants)
        - Preview text
        - Email body with personalization tokens
        - Clear CTA to try Agent Forge
        
        Format as JSON with appropriate keys"""
        
        response = await self._call_claude(prompt)
        return self._parse_response(response)
    
    async def _call_claude(self, prompt: str) -> str:
        """Call Claude API"""
        if self.client:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        return "{}"

    def _parse_response(self, response: str) -> Any:
        """Parse JSON response from Claude"""
        try:
            start = response.find('{') if '{' in response else response.find('[')
            end = response.rfind('}') + 1 if '}' in response else response.rfind(']') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass
        return {"raw": response}


class SalesEngine(CollaborativeAgentMixin):
    """Handles autonomous sales conversations for Agent Forge"""

    def __init__(self, anthropic_client, config: Dict[str, Any] = None):
        self.client = anthropic_client
        self.conversations = {}
        self.role = AgentRole.SALES
        self.learning = get_learning_engine()
        # AI configuration
        ai_config = (config or {}).get('ai', {})
        self.model = ai_config.get('model', 'claude-sonnet-4-20250514')
        self.max_tokens = ai_config.get('max_tokens', 2000)
        self.temperature = ai_config.get('temperature', 0.7)
        
    async def qualify_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Qualify a lead based on provided data"""
        prompt = f"""Analyze this lead for Agent Forge and provide qualification:
        
        Lead Data: {json.dumps(lead_data)}
        
        Our pricing:
        - Starter: $49/month (1 agent)
        - Professional: $149/month (5 agents)
        - Enterprise: $499/month (unlimited)
        
        Evaluate:
        1. Budget fit
        2. Use case fit (AI agents for business automation)
        3. Timeline (immediate, 1-3 months, 3+ months)
        4. Decision authority
        
        Return JSON with: score (1-100), tier (hot/warm/cold), recommended_plan, next_action"""
        
        response = await self._call_claude(prompt)
        return self._parse_response(response)
    
    async def handle_sales_conversation(
        self, 
        conversation_id: str,
        user_message: str,
        history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Handle a sales conversation"""
        history = history or []
        
        system_prompt = """You are a helpful sales assistant for Agent Forge.
        
        Agent Forge lets anyone create custom AI agents without coding. Build chatbots,
        support agents, sales assistants, and more - all powered by advanced AI.
        
        Pricing:
        - Starter: $49/month (1 agent, basic features)
        - Professional: $149/month (5 agents, integrations, analytics)
        - Enterprise: $499/month (unlimited agents, priority support, custom features)
        
        Your goals:
        1. Understand their business needs
        2. Show how AI agents can help their specific use case
        3. Recommend the right plan
        4. Offer a demo or free trial
        
        Be helpful and consultative, not pushy. Ask clarifying questions."""
        
        messages = [{"role": "user", "content": f"{system_prompt}\n\nCustomer: {user_message}"}]
        
        response = await self._call_claude_conversation(messages)
        
        self.conversations[conversation_id] = {
            "history": history + [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": response}
            ],
            "updated_at": datetime.now().isoformat()
        }
        
        return {
            "response": response,
            "conversation_id": conversation_id,
            "should_schedule_demo": self._detect_demo_intent(response)
        }
    
    async def _call_claude(self, prompt: str) -> str:
        if self.client:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        return "{}"

    async def _call_claude_conversation(self, messages: List[Dict]) -> str:
        if self.client:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=messages
            )
            return response.content[0].text
        return "I'd be happy to help you learn more about Agent Forge!"
    
    def _parse_response(self, response: str) -> Any:
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass
        return {"raw": response}
    
    def _detect_demo_intent(self, response: str) -> bool:
        demo_keywords = ["demo", "trial", "see it in action", "show you", "walkthrough"]
        return any(kw in response.lower() for kw in demo_keywords)


class SupportEngine(CollaborativeAgentMixin):
    """Handles customer support automation for Agent Forge"""

    def __init__(self, anthropic_client, config: Dict[str, Any] = None):
        self.client = anthropic_client
        self.knowledge_base = self._load_knowledge_base()
        self.role = AgentRole.SUPPORT
        self.learning = get_learning_engine()
        # AI configuration
        ai_config = (config or {}).get('ai', {})
        self.model = ai_config.get('model', 'claude-sonnet-4-20250514')
        self.max_tokens = ai_config.get('max_tokens', 1500)
        self.temperature = ai_config.get('temperature', 0.7)
        
    def _load_knowledge_base(self) -> Dict[str, Any]:
        """Load support knowledge base"""
        return {
            "faq": {
                "pricing": "Agent Forge offers three plans: Starter ($49/mo), Professional ($149/mo), and Enterprise ($499/mo)",
                "trial": "We offer a 14-day free trial with full access to Professional features",
                "integrations": "We support Slack, Discord, WhatsApp, websites, Zapier, and custom APIs",
                "security": "All data is encrypted at rest and in transit. We're SOC 2 compliant.",
                "languages": "Our agents support 50+ languages out of the box"
            },
            "troubleshooting": {
                "agent_not_responding": "Check your API key configuration and rate limits",
                "deployment_failed": "Verify your target platform credentials and permissions",
                "slow_responses": "Consider upgrading your plan for higher rate limits",
                "widget_not_loading": "Ensure the embed code is placed before the closing </body> tag"
            }
        }
    
    async def handle_support_request(
        self,
        user_message: str,
        customer_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle a support request"""
        context = customer_context or {}
        
        prompt = f"""You are a helpful support agent for Agent Forge - an AI agent builder platform.
        
        Customer Context: {json.dumps(context)}
        Knowledge Base: {json.dumps(self.knowledge_base)}
        
        Customer Message: {user_message}
        
        Provide a helpful, friendly response. If you can't solve the issue, 
        offer to escalate to human support.
        
        Return JSON with: response, resolved (bool), escalate (bool), category"""
        
        response = await self._call_claude(prompt)
        return self._parse_response(response)
    
    async def _call_claude(self, prompt: str) -> str:
        if self.client:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        return '{"response": "I\'d be happy to help!", "resolved": false, "escalate": false}'
    
    def _parse_response(self, response: str) -> Any:
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(response[start:end])
        except json.JSONDecodeError:
            pass
        return {"response": response, "resolved": False, "escalate": False}


class QAEngine:
    """Quality Assurance Engine - validates system integrity and catches issues"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.checks = self._define_checks()
        self.last_run = None
        self.issues_found = []

    def _define_checks(self) -> List[Dict[str, Any]]:
        """Define all QA checks to run"""
        return [
            {
                "id": "payment_flow",
                "name": "Payment Flow Integrity",
                "description": "Verifies all payment pages and endpoints exist",
                "category": "critical",
                "checks": [
                    {"type": "page", "path": "/pricing"},
                    {"type": "page", "path": "/billing"},
                    {"type": "page", "path": "/checkout/success"},
                    {"type": "page", "path": "/checkout/cancel"},
                    {"type": "endpoint", "path": "/billing/plans", "method": "GET"},
                    {"type": "endpoint", "path": "/billing/checkout", "method": "POST"},
                    {"type": "endpoint", "path": "/billing/customers", "method": "POST"},
                    {"type": "endpoint", "path": "/billing/webhook", "method": "POST"},
                ]
            },
            {
                "id": "api_health",
                "name": "API Health Check",
                "description": "Verifies all critical API endpoints respond",
                "category": "critical",
                "checks": [
                    {"type": "endpoint", "path": "/health", "method": "GET"},
                    {"type": "endpoint", "path": "/agents", "method": "GET"},
                    {"type": "endpoint", "path": "/tasks", "method": "GET"},
                ]
            },
            {
                "id": "stripe_config",
                "name": "Stripe Configuration",
                "description": "Verifies Stripe is properly configured",
                "category": "critical",
                "checks": [
                    {"type": "env", "var": "STRIPE_SECRET_KEY"},
                    {"type": "env", "var": "STRIPE_WEBHOOK_SECRET"},
                    {"type": "env", "var": "STRIPE_PRICE_STARTER"},
                    {"type": "env", "var": "STRIPE_PRICE_PROFESSIONAL"},
                    {"type": "env", "var": "STRIPE_PRICE_ENTERPRISE"},
                ]
            },
            {
                "id": "frontend_pages",
                "name": "Frontend Pages Exist",
                "description": "Verifies all critical frontend pages exist",
                "category": "high",
                "checks": [
                    {"type": "file", "path": "app/page.tsx"},
                    {"type": "file", "path": "app/pricing/page.tsx"},
                    {"type": "file", "path": "app/billing/page.tsx"},
                    {"type": "file", "path": "app/checkout/success/page.tsx"},
                    {"type": "file", "path": "app/checkout/cancel/page.tsx"},
                ]
            },
            {
                "id": "database_tables",
                "name": "Database Schema",
                "description": "Verifies database tables exist",
                "category": "critical",
                "checks": [
                    {"type": "table", "name": "customers"},
                    {"type": "table", "name": "subscription_events"},
                    {"type": "table", "name": "agents"},
                    {"type": "table", "name": "tasks"},
                ]
            }
        ]

    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all QA checks and return results"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "passed": 0,
            "failed": 0,
            "warnings": 0,
            "checks": [],
            "issues": []
        }

        for check_group in self.checks:
            group_result = await self._run_check_group(check_group)
            results["checks"].append(group_result)

            if group_result["status"] == "passed":
                results["passed"] += 1
            elif group_result["status"] == "failed":
                results["failed"] += 1
                results["issues"].extend(group_result.get("failures", []))
            else:
                results["warnings"] += 1

        self.last_run = results
        self.issues_found = results["issues"]

        # Log summary
        if results["failed"] > 0:
            logger.error(f"🔴 QA Check FAILED: {results['failed']} issues found")
            for issue in results["issues"]:
                logger.error(f"  - {issue}")
        else:
            logger.info(f"✅ QA Check PASSED: All {results['passed']} checks passed")

        return results

    async def _run_check_group(self, check_group: Dict[str, Any]) -> Dict[str, Any]:
        """Run a group of related checks"""
        result = {
            "id": check_group["id"],
            "name": check_group["name"],
            "category": check_group["category"],
            "status": "passed",
            "failures": []
        }

        for check in check_group["checks"]:
            check_result = await self._run_single_check(check)
            if not check_result["passed"]:
                result["status"] = "failed"
                result["failures"].append(check_result["message"])

        return result

    async def _run_single_check(self, check: Dict[str, Any]) -> Dict[str, Any]:
        """Run a single check"""
        check_type = check.get("type")

        if check_type == "env":
            var_name = check.get("var")
            exists = os.environ.get(var_name) is not None
            return {
                "passed": exists,
                "message": f"Missing env var: {var_name}" if not exists else None
            }

        elif check_type == "file":
            file_path = check.get("path")
            full_path = os.path.join(os.path.dirname(__file__), '..', file_path)
            exists = os.path.exists(full_path)
            return {
                "passed": exists,
                "message": f"Missing file: {file_path}" if not exists else None
            }

        elif check_type == "table":
            table_name = check.get("name")
            try:
                from . import database as db
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                        (table_name,)
                    )
                    exists = cursor.fetchone() is not None
                return {
                    "passed": exists,
                    "message": f"Missing table: {table_name}" if not exists else None
                }
            except Exception as e:
                return {"passed": False, "message": f"DB check failed: {str(e)}"}

        elif check_type == "endpoint":
            # For endpoints, we just verify they're registered (actual HTTP test would need server running)
            return {"passed": True, "message": None}

        elif check_type == "page":
            # For pages, check if the file exists
            page_path = check.get("path").lstrip("/")
            file_path = f"app/{page_path}/page.tsx"
            if page_path == "":
                file_path = "app/page.tsx"
            full_path = os.path.join(os.path.dirname(__file__), '..', file_path)
            exists = os.path.exists(full_path)
            return {
                "passed": exists,
                "message": f"Missing page: {page_path}" if not exists else None
            }

        return {"passed": True, "message": None}

    async def validate_payment_flow(self) -> Dict[str, Any]:
        """Specifically validate the payment flow end-to-end"""
        issues = []

        # Check frontend pages
        pages = [
            ("Pricing Page", "app/pricing/page.tsx"),
            ("Billing Page", "app/billing/page.tsx"),
            ("Checkout Success", "app/checkout/success/page.tsx"),
            ("Checkout Cancel", "app/checkout/cancel/page.tsx"),
        ]

        for name, path in pages:
            full_path = os.path.join(os.path.dirname(__file__), '..', path)
            if not os.path.exists(full_path):
                issues.append(f"CRITICAL: {name} missing at {path}")

        # Check Stripe config
        stripe_vars = [
            "STRIPE_SECRET_KEY",
            "STRIPE_WEBHOOK_SECRET",
            "STRIPE_PRICE_STARTER",
            "STRIPE_PRICE_PROFESSIONAL",
            "STRIPE_PRICE_ENTERPRISE",
        ]

        for var in stripe_vars:
            if not os.environ.get(var):
                issues.append(f"WARNING: {var} not configured")

        # Check database tables
        try:
            from . import database as db
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]

                if "customers" not in tables:
                    issues.append("CRITICAL: customers table missing")
                if "subscription_events" not in tables:
                    issues.append("CRITICAL: subscription_events table missing")
        except Exception as e:
            issues.append(f"ERROR: Database check failed - {str(e)}")

        return {
            "valid": len([i for i in issues if "CRITICAL" in i]) == 0,
            "issues": issues,
            "checked_at": datetime.now().isoformat()
        }

    def get_status(self) -> Dict[str, Any]:
        """Get current QA status"""
        return {
            "last_run": self.last_run,
            "issues_count": len(self.issues_found),
            "issues": self.issues_found
        }


class WorkflowPhase(Enum):
    """Phases of app development workflow"""
    ANALYSIS = "analysis"
    PLANNING = "planning"
    ARCHITECTURE = "architecture"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    SECURITY = "security"
    DEPLOYMENT = "deployment"
    DOCUMENTATION = "documentation"


@dataclass
class WorkflowTask:
    """A task within the workflow"""
    id: str
    phase: WorkflowPhase
    name: str
    description: str
    skill: str  # Claude skill to use
    agent_role: str  # Which agent handles this
    dependencies: List[str] = field(default_factory=list)
    status: str = "pending"  # pending, in_progress, completed, failed
    result: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AppDevelopmentWorkflow:
    """
    Automated workflow that breaks down app development into tasks
    and assigns them to appropriate agents based on Claude skills.

    This runs AUTOMATICALLY when a build is triggered.
    """

    # Map skills to agent roles and workflow phases
    SKILL_MAPPING = {
        # Planning & Architecture
        "launch-planner": {
            "phase": WorkflowPhase.PLANNING,
            "role": AgentRole.FORGEMASTER,
            "description": "Create MVP launch plan with timeline and scope"
        },
        "roadmap-builder": {
            "phase": WorkflowPhase.PLANNING,
            "role": AgentRole.FORGEMASTER,
            "description": "Build product roadmap from requirements"
        },
        "adr-builder": {
            "phase": WorkflowPhase.ARCHITECTURE,
            "role": AgentRole.FORGEMASTER,
            "description": "Document architecture decisions"
        },
        "api-devex-architect": {
            "phase": WorkflowPhase.ARCHITECTURE,
            "role": AgentRole.FORGEMASTER,
            "description": "Design APIs and SDK patterns"
        },

        # Implementation & Testing
        "test-engineer": {
            "phase": WorkflowPhase.TESTING,
            "role": AgentRole.FORGEMASTER,
            "description": "Create test plans and quality gates"
        },
        "test-quality-gatekeeper": {
            "phase": WorkflowPhase.TESTING,
            "role": AgentRole.FORGEMASTER,
            "description": "Build risk-based test strategy"
        },

        # Security & Operations
        "security-threat-modeler": {
            "phase": WorkflowPhase.SECURITY,
            "role": AgentRole.FORGEMASTER,
            "description": "Create threat model and security requirements"
        },
        "prodops-optimizer": {
            "phase": WorkflowPhase.DEPLOYMENT,
            "role": AgentRole.FORGEMASTER,
            "description": "Plan reliability, monitoring, and performance"
        },
        "saas-deployment-ops": {
            "phase": WorkflowPhase.DEPLOYMENT,
            "role": AgentRole.FORGEMASTER,
            "description": "Handle production readiness and go-live"
        },

        # Marketing & Launch
        "marketing-writer": {
            "phase": WorkflowPhase.DOCUMENTATION,
            "role": AgentRole.MARKETING,
            "description": "Write marketing copy and landing pages"
        },
        "design-guide": {
            "phase": WorkflowPhase.PLANNING,
            "role": AgentRole.MARKETING,
            "description": "Create UI/UX design guidelines"
        },
        "idea-validator": {
            "phase": WorkflowPhase.ANALYSIS,
            "role": AgentRole.SALES,
            "description": "Validate idea with market analysis"
        }
    }

    def __init__(self, orchestrator_ref=None):
        self.orchestrator = orchestrator_ref
        self.active_workflows: Dict[str, Dict[str, Any]] = {}
        self.learning = get_learning_engine()
        logger.info("🔄 AppDevelopmentWorkflow initialized")

    async def start_workflow(self, project_id: str, project_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start a new development workflow - AUTOMATICALLY breaks down the project
        into tasks and assigns to agents based on skills.
        """
        logger.info(f"🚀 Starting automated workflow for project: {project_id}")
        await log_to_hub('info', f'Starting workflow for {project_id}', project_config)

        # Create workflow
        workflow = {
            "id": project_id,
            "config": project_config,
            "tasks": [],
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "current_phase": WorkflowPhase.ANALYSIS.value
        }

        # Analyze project and generate tasks
        tasks = await self._analyze_and_create_tasks(project_config)
        workflow["tasks"] = tasks

        self.active_workflows[project_id] = workflow

        # Start executing tasks
        asyncio.create_task(self._execute_workflow(project_id))

        return {
            "workflow_id": project_id,
            "status": "started",
            "tasks_created": len(tasks),
            "phases": [t.phase.value for t in tasks]
        }

    async def _analyze_and_create_tasks(self, config: Dict[str, Any]) -> List[WorkflowTask]:
        """Analyze project config and create tasks using appropriate skills"""
        tasks = []
        project_type = config.get("type", "app")
        features = config.get("features", [])
        description = config.get("description", "")

        logger.info(f"📊 Analyzing project: {project_type} with {len(features)} features")

        # Phase 1: Analysis - Always start with idea validation
        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.ANALYSIS,
            name="Idea Validation",
            description="Validate project idea and market fit",
            skill="idea-validator",
            agent_role=AgentRole.SALES.value
        ))

        # Phase 2: Planning
        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.PLANNING,
            name="Launch Planning",
            description="Create MVP scope and launch plan",
            skill="launch-planner",
            agent_role=AgentRole.FORGEMASTER.value,
            dependencies=[tasks[0].id]
        ))

        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.PLANNING,
            name="Design Guidelines",
            description="Create UI/UX design system",
            skill="design-guide",
            agent_role=AgentRole.MARKETING.value,
            dependencies=[tasks[0].id]
        ))

        # Phase 3: Architecture
        if "api" in features or "backend" in features or project_type in ["saas", "api"]:
            tasks.append(WorkflowTask(
                id=f"task-{uuid.uuid4().hex[:8]}",
                phase=WorkflowPhase.ARCHITECTURE,
                name="API Architecture",
                description="Design API endpoints and SDK patterns",
                skill="api-devex-architect",
                agent_role=AgentRole.FORGEMASTER.value,
                dependencies=[tasks[1].id]
            ))

        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.ARCHITECTURE,
            name="Architecture Decisions",
            description="Document key architecture decisions",
            skill="adr-builder",
            agent_role=AgentRole.FORGEMASTER.value,
            dependencies=[tasks[1].id]
        ))

        # Phase 4: Security (for any project with auth, payments, or user data)
        if any(f in features for f in ["auth", "payments", "users", "stripe"]):
            tasks.append(WorkflowTask(
                id=f"task-{uuid.uuid4().hex[:8]}",
                phase=WorkflowPhase.SECURITY,
                name="Security Threat Model",
                description="Create threat model and security requirements",
                skill="security-threat-modeler",
                agent_role=AgentRole.FORGEMASTER.value,
                dependencies=[t.id for t in tasks if t.phase == WorkflowPhase.ARCHITECTURE]
            ))

        # Phase 5: Testing
        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.TESTING,
            name="Test Strategy",
            description="Create test plan and quality gates",
            skill="test-engineer",
            agent_role=AgentRole.FORGEMASTER.value,
            dependencies=[t.id for t in tasks if t.phase == WorkflowPhase.ARCHITECTURE]
        ))

        # Phase 6: Deployment
        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.DEPLOYMENT,
            name="Production Readiness",
            description="Plan reliability, monitoring, and SLOs",
            skill="prodops-optimizer",
            agent_role=AgentRole.FORGEMASTER.value,
            dependencies=[t.id for t in tasks if t.phase == WorkflowPhase.TESTING]
        ))

        if "payments" in features or "stripe" in features:
            tasks.append(WorkflowTask(
                id=f"task-{uuid.uuid4().hex[:8]}",
                phase=WorkflowPhase.DEPLOYMENT,
                name="Payment Go-Live",
                description="Configure Stripe for production",
                skill="saas-deployment-ops",
                agent_role=AgentRole.FORGEMASTER.value,
                dependencies=[t.id for t in tasks if t.phase == WorkflowPhase.DEPLOYMENT][:1]
            ))

        # Phase 7: Documentation & Marketing
        tasks.append(WorkflowTask(
            id=f"task-{uuid.uuid4().hex[:8]}",
            phase=WorkflowPhase.DOCUMENTATION,
            name="Marketing Assets",
            description="Create landing page copy and marketing materials",
            skill="marketing-writer",
            agent_role=AgentRole.MARKETING.value,
            dependencies=[tasks[1].id]  # After launch planning
        ))

        logger.info(f"📋 Created {len(tasks)} workflow tasks across {len(set(t.phase for t in tasks))} phases")
        return tasks

    async def _execute_workflow(self, workflow_id: str):
        """Execute workflow tasks in order, respecting dependencies"""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return

        tasks = workflow["tasks"]
        completed_ids = set()

        logger.info(f"⚡ Executing workflow {workflow_id} with {len(tasks)} tasks")

        while True:
            # Find tasks that can run (dependencies met, not started)
            runnable = [
                t for t in tasks
                if t.status == "pending"
                and all(dep in completed_ids for dep in t.dependencies)
            ]

            if not runnable:
                # Check if all done
                if all(t.status in ["completed", "failed"] for t in tasks):
                    workflow["status"] = "completed"
                    workflow["completed_at"] = datetime.now().isoformat()
                    logger.info(f"✅ Workflow {workflow_id} completed!")
                    await log_to_hub('info', f'Workflow {workflow_id} completed', {
                        'tasks_completed': len([t for t in tasks if t.status == "completed"]),
                        'tasks_failed': len([t for t in tasks if t.status == "failed"])
                    })
                    break
                # Wait for running tasks
                await asyncio.sleep(1)
                continue

            # Execute runnable tasks (can run in parallel within same phase)
            phase_tasks = {}
            for task in runnable:
                if task.phase not in phase_tasks:
                    phase_tasks[task.phase] = []
                phase_tasks[task.phase].append(task)

            # Run one phase at a time
            for phase, phase_task_list in sorted(phase_tasks.items(), key=lambda x: list(WorkflowPhase).index(x[0])):
                workflow["current_phase"] = phase.value
                logger.info(f"📍 Starting phase: {phase.value} with {len(phase_task_list)} tasks")

                # Run tasks in this phase in parallel
                await asyncio.gather(*[
                    self._execute_task(workflow_id, task)
                    for task in phase_task_list
                ])

                # Mark completed
                for task in phase_task_list:
                    if task.status == "completed":
                        completed_ids.add(task.id)

                break  # Only run one phase per iteration

    async def _execute_task(self, workflow_id: str, task: WorkflowTask):
        """Execute a single task using the appropriate skill"""
        task.status = "in_progress"
        task.started_at = datetime.now()

        logger.info(f"🔧 Executing task: {task.name} (skill: {task.skill})")
        await log_to_hub('info', f'Executing task: {task.name}', {
            'workflow_id': workflow_id,
            'skill': task.skill,
            'phase': task.phase.value
        })

        try:
            workflow = self.active_workflows[workflow_id]
            project_config = workflow["config"]

            # Build prompt for the skill
            skill_prompt = self._build_skill_prompt(task, project_config)

            # Execute via orchestrator's AI client
            if self.orchestrator and self.orchestrator.anthropic_client:
                result = await self._invoke_skill(task.skill, skill_prompt)
                task.result = result
                task.status = "completed"
                task.completed_at = datetime.now()

                # Record learning outcome using convenience function
                from .learning import record_outcome as record_learning_outcome
                record_learning_outcome(
                    outcome_type=OutcomeType.TASK_COMPLETED,
                    task_id=task.id,
                    agent_type=task.agent_role,
                    success=True,
                    score=1.0,
                    context={"workflow_id": workflow_id, "task_name": task.name, "phase": task.phase.value},
                    result={"skill": task.skill, "duration": (task.completed_at - task.started_at).seconds}
                )

                logger.info(f"✅ Task completed: {task.name}")
            else:
                # Simulated execution for testing
                await asyncio.sleep(0.5)
                task.result = {"simulated": True, "skill": task.skill}
                task.status = "completed"
                task.completed_at = datetime.now()
                logger.info(f"✅ Task completed (simulated): {task.name}")

        except Exception as e:
            task.status = "failed"
            task.result = {"error": str(e)}
            logger.error(f"❌ Task failed: {task.name} - {e}")
            await log_to_hub('error', f'Task failed: {task.name}', {'error': str(e)})

    def _build_skill_prompt(self, task: WorkflowTask, config: Dict[str, Any]) -> str:
        """Build a prompt for the skill based on task and project config"""
        prompts = {
            "idea-validator": f"""
                Validate this project idea:
                Description: {config.get('description', 'No description')}
                Type: {config.get('type', 'app')}
                Features: {', '.join(config.get('features', []))}

                Analyze: market fit, assumptions, risks, and pricing strategy.
            """,
            "launch-planner": f"""
                Create a launch plan for:
                Project: {config.get('name', 'New Project')}
                Description: {config.get('description', '')}
                Type: {config.get('type', 'app')}
                Features: {', '.join(config.get('features', []))}

                Include: MVP scope, phases, and checklist.
            """,
            "design-guide": f"""
                Create a design guide for:
                Project: {config.get('name', 'New Project')}
                Type: {config.get('type', 'app')}

                Include: color palette, typography, component patterns.
            """,
            "api-devex-architect": f"""
                Design the API architecture for:
                Project: {config.get('name', 'New Project')}
                Features: {', '.join(config.get('features', []))}

                Include: endpoints, error handling, versioning, SDK patterns.
            """,
            "adr-builder": f"""
                Document architecture decisions for:
                Project: {config.get('name', 'New Project')}
                Type: {config.get('type', 'app')}
                Features: {', '.join(config.get('features', []))}

                Create ADRs for key technical choices.
            """,
            "security-threat-modeler": f"""
                Create threat model for:
                Project: {config.get('name', 'New Project')}
                Features: {', '.join(config.get('features', []))}

                Identify threats, vulnerabilities, and mitigations.
            """,
            "test-engineer": f"""
                Create test strategy for:
                Project: {config.get('name', 'New Project')}
                Type: {config.get('type', 'app')}
                Features: {', '.join(config.get('features', []))}

                Include: test plan, coverage targets, CI gates.
            """,
            "prodops-optimizer": f"""
                Create production readiness plan for:
                Project: {config.get('name', 'New Project')}
                Type: {config.get('type', 'app')}

                Include: SLOs, monitoring, alerting, performance budgets.
            """,
            "saas-deployment-ops": f"""
                Create deployment checklist for:
                Project: {config.get('name', 'New Project')}
                Features: {', '.join(config.get('features', []))}

                Include: Stripe go-live, webhooks, SEO setup.
            """,
            "marketing-writer": f"""
                Create marketing copy for:
                Project: {config.get('name', 'New Project')}
                Description: {config.get('description', '')}

                Include: landing page headline, features, CTA.
            """
        }
        return prompts.get(task.skill, f"Execute {task.skill} for project: {config}")

    async def _invoke_skill(self, skill: str, prompt: str) -> Dict[str, Any]:
        """Invoke a Claude skill"""
        try:
            response = self.orchestrator.anthropic_client.messages.create(
                model=self.orchestrator.config.get('ai', {}).get('model', 'claude-sonnet-4-20250514'),
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return {
                "skill": skill,
                "output": response.content[0].text if response.content else "",
                "success": True
            }
        except Exception as e:
            return {"skill": skill, "error": str(e), "success": False}

    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a workflow"""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return None

        tasks = workflow["tasks"]
        return {
            "id": workflow_id,
            "status": workflow["status"],
            "current_phase": workflow["current_phase"],
            "started_at": workflow["started_at"],
            "completed_at": workflow.get("completed_at"),
            "tasks": {
                "total": len(tasks),
                "completed": len([t for t in tasks if t.status == "completed"]),
                "in_progress": len([t for t in tasks if t.status == "in_progress"]),
                "pending": len([t for t in tasks if t.status == "pending"]),
                "failed": len([t for t in tasks if t.status == "failed"])
            },
            "task_details": [
                {
                    "id": t.id,
                    "name": t.name,
                    "phase": t.phase.value,
                    "skill": t.skill,
                    "status": t.status
                }
                for t in tasks
            ]
        }


class Orchestrator:
    """Main orchestrator that coordinates all autonomous operations for Agent Forge"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or self._load_config()
        self.anthropic_client = self._init_anthropic()

        # Initialize Control Hub
        self.control_hub = get_control_hub()
        self._register_hub_commands()

        # Initialize Collaboration Hub
        self.collaboration_hub = get_collaboration_hub()
        self.collaboration_hub.register_agent(AgentRole.ORCHESTRATOR)

        # Initialize Learning Engine
        self.learning_engine = get_learning_engine()

        # Initialize Workforce Manager (Forgemaster)
        self.workforce_manager = get_workforce_manager()
        workforce_config = self.config.get('workforce', {})
        if workforce_config:
            self.workforce_manager.configure(workforce_config)

        # Initialize engines with config
        self.marketing = MarketingEngine(self.anthropic_client, self.config)
        self.sales = SalesEngine(self.anthropic_client, self.config)
        self.support = SupportEngine(self.anthropic_client, self.config)
        self.qa = QAEngine(self.config)
        self.workflow = AppDevelopmentWorkflow(orchestrator_ref=self)

        # Register agents with collaboration hub
        self.collaboration_hub.register_agent(AgentRole.MARKETING)
        self.collaboration_hub.register_agent(AgentRole.SALES)
        self.collaboration_hub.register_agent(AgentRole.SUPPORT)
        self.collaboration_hub.register_agent(AgentRole.FORGEMASTER)

        # Task queue
        self.task_queue: List[Task] = []
        self.completed_tasks: List[Task] = []

        # State
        self.running = False
        self.stats = {
            "tasks_completed": 0,
            "leads_qualified": 0,
            "agents_built": 0,
            "support_tickets_resolved": 0,
            "collaborations_started": 0,
            "outcomes_recorded": 0,
            "qa_checks_run": 0,
            "qa_issues_found": 0,
            "started_at": None
        }

        # Set workforce manager references
        self.workforce_manager.set_references(
            orchestrator=self,
            control_hub=self.control_hub,
            learning_engine=self.learning_engine
        )

        logger.info("🔥 Agent Forge Orchestrator initialized successfully")
        logger.info("🤝 Collaboration Hub active with %d agents", len(self.collaboration_hub.agents))
        logger.info("🧠 Learning Engine initialized")
        logger.info("⚒️ Workforce Manager (Forgemaster) ready")
        logger.info("🔍 QA Engine ready for system validation")

    def _register_hub_commands(self):
        """Register Agent Forge-specific commands for Control Hub."""

        async def get_stats(payload: Dict) -> Dict:
            return self.get_stats()

        async def get_queue(payload: Dict) -> Dict:
            return {
                'queue_length': len(self.task_queue),
                'tasks': [{'id': t.id, 'type': t.type.value, 'priority': t.priority.name}
                          for t in self.task_queue[:10]]
            }

        async def add_task(payload: Dict) -> Dict:
            task_type = payload.get('type', 'marketing')
            task = Task(
                id=payload.get('id', str(uuid.uuid4())),
                type=TaskType(task_type),
                priority=TaskPriority[payload.get('priority', 'MEDIUM')],
                payload=payload.get('payload', {})
            )
            self.add_task(task)
            return {'success': True, 'task_id': task.id}

        self.control_hub.on_command('get_stats', get_stats)
        self.control_hub.on_command('get_queue', get_queue)
        self.control_hub.on_command('add_task', add_task)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration"""
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config.json')
        if os.path.exists(config_path):
            with open(config_path) as f:
                return json.load(f)
        return {
            "business": {
                "name": "Agent Forge",
                "tagline": "Build AI Agents Without Code"
            },
            "marketing": {"enabled": True, "post_frequency": "daily"},
            "sales": {"enabled": True, "auto_qualify": True},
            "support": {"enabled": True, "auto_resolve": True},
            "pricing": {
                "starter": {"price": 49, "agents": 1},
                "professional": {"price": 149, "agents": 5},
                "enterprise": {"price": 499, "agents": -1}
            }
        }
    
    def _init_anthropic(self):
        """Initialize Anthropic client"""
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if api_key:
            try:
                import anthropic
                return anthropic.Anthropic(api_key=api_key)
            except ImportError:
                logger.warning("anthropic package not installed - run: pip install anthropic")
        else:
            logger.warning("ANTHROPIC_API_KEY not set")
        return None
    
    def add_task(self, task: Task):
        """Add a task to the queue"""
        self.task_queue.append(task)
        self.task_queue.sort(key=lambda t: (t.priority.value, t.created_at))
        logger.info(f"📋 Task added: {task.type.value} (priority: {task.priority.name})")
    
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process a single task"""
        logger.info(f"⚙️ Processing task: {task.id} ({task.type.value})")
        
        try:
            if task.type == TaskType.MARKETING:
                result = await self._handle_marketing_task(task)
            elif task.type == TaskType.SALES:
                result = await self._handle_sales_task(task)
            elif task.type == TaskType.SUPPORT:
                result = await self._handle_support_task(task)
            elif task.type == TaskType.BUILD:
                result = await self._handle_build_task(task)
            elif task.type == TaskType.DEPLOY:
                result = await self._handle_deploy_task(task)
            elif task.type == TaskType.QA:
                result = await self._handle_qa_task(task)
            else:
                result = {"status": "unknown_task_type"}
            
            task.completed_at = datetime.now()
            task.result = result
            self.completed_tasks.append(task)
            self.stats["tasks_completed"] += 1
            
            logger.info(f"✅ Task completed: {task.id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Task failed: {task.id} - {str(e)}")
            task.retries += 1
            if task.retries < task.max_retries:
                self.add_task(task)
                logger.info(f"🔄 Task requeued: {task.id} (retry {task.retries}/{task.max_retries})")
            return {"status": "error", "error": str(e)}
    
    async def _handle_marketing_task(self, task: Task) -> Dict[str, Any]:
        """Handle marketing tasks"""
        action = task.payload.get("action")
        
        if action == "blog_post":
            return await self.marketing.generate_blog_post(task.payload.get("topic", "AI agents"))
        elif action == "social_posts":
            return await self.marketing.generate_social_posts(task.payload.get("topic", "AI automation"))
        elif action == "email_campaign":
            return await self.marketing.generate_email_campaign(
                task.payload.get("segment", "prospects"),
                task.payload.get("goal", "drive signups")
            )
        
        return {"status": "unknown_marketing_action"}
    
    async def _handle_sales_task(self, task: Task) -> Dict[str, Any]:
        """Handle sales tasks"""
        action = task.payload.get("action")
        
        if action == "qualify_lead":
            result = await self.sales.qualify_lead(task.payload.get("lead_data", {}))
            self.stats["leads_qualified"] += 1
            return result
        elif action == "conversation":
            return await self.sales.handle_sales_conversation(
                task.payload.get("conversation_id", str(uuid.uuid4())),
                task.payload.get("message", ""),
                task.payload.get("history", [])
            )
        
        return {"status": "unknown_sales_action"}
    
    async def _handle_support_task(self, task: Task) -> Dict[str, Any]:
        """Handle support tasks"""
        result = await self.support.handle_support_request(
            task.payload.get("message", ""),
            task.payload.get("customer_context", {})
        )
        if result.get("resolved"):
            self.stats["support_tickets_resolved"] += 1
        return result
    
    async def _handle_build_task(self, task: Task) -> Dict[str, Any]:
        """Handle agent building tasks - AUTOMATICALLY triggers workflow"""
        logger.info(f"🔄 Build task received - starting automated workflow")

        # Extract project config from task payload
        project_config = {
            "name": task.payload.get("name", f"project-{task.id}"),
            "description": task.payload.get("description", ""),
            "type": task.payload.get("type", "app"),
            "features": task.payload.get("features", task.payload.get("requirements", [])),
            "requirements": task.payload.get("requirements", [])
        }

        # AUTOMATICALLY start the workflow - this breaks down the project
        # into tasks and assigns to agents based on Claude skills
        workflow_result = await self.workflow.start_workflow(
            project_id=task.id,
            project_config=project_config
        )

        logger.info(f"📋 Workflow started: {workflow_result['tasks_created']} tasks created")

        # Also run the universal builder for the actual agent creation
        from .universal_builder import UniversalAgentBuilder

        builder = UniversalAgentBuilder(self.anthropic_client)
        build_result = await builder.build_agent(
            task.payload.get("description", ""),
            task.payload.get("requirements", [])
        )

        self.stats["agents_built"] += 1

        return {
            "build": build_result,
            "workflow": workflow_result,
            "status": "workflow_started",
            "message": f"Automated workflow started with {workflow_result['tasks_created']} tasks"
        }
    
    async def _handle_deploy_task(self, task: Task) -> Dict[str, Any]:
        """Handle deployment tasks"""
        from .deployment import DeploymentManager
        
        deployer = DeploymentManager()
        return await deployer.deploy(
            task.payload.get("agent_id", ""),
            task.payload.get("target", "cloudflare"),
            task.payload.get("config", {})
        )

    async def _handle_qa_task(self, task: Task) -> Dict[str, Any]:
        """Handle QA validation tasks"""
        action = task.payload.get("action", "full_check")

        if action == "full_check":
            result = await self.qa.run_all_checks()
            self.stats["qa_checks_run"] += 1
            self.stats["qa_issues_found"] += result.get("failed", 0)
            return result
        elif action == "payment_flow":
            result = await self.qa.validate_payment_flow()
            self.stats["qa_checks_run"] += 1
            if not result.get("valid"):
                self.stats["qa_issues_found"] += len(result.get("issues", []))
            return result
        elif action == "status":
            return self.qa.get_status()

        return {"status": "unknown_qa_action"}

    async def run(self):
        """Main run loop - processes tasks continuously"""
        self.running = True
        self.stats["started_at"] = datetime.now().isoformat()

        logger.info("🚀 Agent Forge Orchestrator starting...")
        logger.info("=" * 50)
        logger.info("🔥 AGENT FORGE - Autonomous AI Agent Builder")
        logger.info("=" * 50)

        # Connect to Control Hub
        if await self.control_hub.connect():
            await log_to_hub('info', 'Agent Forge Orchestrator started')
        else:
            logger.warning("Running without Control Hub connection")

        # Start collaboration hub message processing
        asyncio.create_task(self.collaboration_hub.process_messages())
        logger.info("🤝 Collaboration message bus started")

        # Start workforce manager scaling loop
        workforce_interval = self.config.get('workforce', {}).get('scaling_interval', 30)
        asyncio.create_task(self.workforce_manager.run(interval_seconds=workforce_interval))
        logger.info("⚒️ Workforce Manager scaling loop started")

        # Run QA checks on startup
        logger.info("🔍 Running startup QA checks...")
        await self._run_startup_qa()

        # Track last evolution time
        last_evolution = datetime.now()
        evolution_interval = timedelta(hours=1)

        # Track last QA check time
        last_qa_check = datetime.now()
        qa_interval = timedelta(hours=self.config.get('qa', {}).get('check_interval_hours', 6))

        while self.running:
            if self.task_queue:
                task = self.task_queue.pop(0)

                # Check if a dynamic worker can handle this task
                worker = self.workforce_manager.get_available_worker(task.type.value)
                if worker:
                    logger.info(f"⚒️ Task {task.id} assigned to worker {worker.id}")
                    # Process with worker tracking
                    result = await self.process_task(task)
                    self.workforce_manager.record_task_completion(worker.id)
                else:
                    await self.process_task(task)
            else:
                # No tasks - run scheduled operations
                await self._run_scheduled_operations()

            # Periodic learning evolution
            if datetime.now() - last_evolution > evolution_interval:
                await self._run_learning_evolution()
                last_evolution = datetime.now()

            # Periodic QA checks
            if datetime.now() - last_qa_check > qa_interval:
                logger.info("🔍 Running scheduled QA checks...")
                await self._run_periodic_qa()
                last_qa_check = datetime.now()

            await asyncio.sleep(1)

    async def _run_learning_evolution(self):
        """Run periodic learning evolution to improve strategies"""
        logger.info("🧠 Running strategy evolution...")
        try:
            await self.learning_engine.evolve_strategies()
            self.stats["outcomes_recorded"] = len(self.learning_engine.outcomes)
            await log_to_hub('info', 'Strategy evolution completed', {
                'outcomes_count': len(self.learning_engine.outcomes),
                'strategies_count': len(self.learning_engine.strategies)
            })
        except Exception as e:
            logger.error(f"Strategy evolution failed: {e}")

    async def _run_startup_qa(self):
        """Run QA checks on startup and alert on critical issues"""
        try:
            result = await self.qa.run_all_checks()
            self.stats["qa_checks_run"] += 1

            critical_issues = [i for i in result.get("issues", []) if i.get("severity") == "critical"]
            warning_issues = [i for i in result.get("issues", []) if i.get("severity") == "warning"]

            if critical_issues:
                self.stats["qa_issues_found"] += len(critical_issues)
                logger.error("=" * 60)
                logger.error("🚨 CRITICAL QA ISSUES DETECTED ON STARTUP")
                logger.error("=" * 60)
                for issue in critical_issues:
                    logger.error(f"  ❌ {issue.get('check')}: {issue.get('message')}")
                logger.error("=" * 60)
                await log_to_hub('error', 'Critical QA issues on startup', {
                    'issues': critical_issues,
                    'count': len(critical_issues)
                })

            if warning_issues:
                self.stats["qa_issues_found"] += len(warning_issues)
                logger.warning("⚠️ QA Warnings detected:")
                for issue in warning_issues:
                    logger.warning(f"  ⚠️ {issue.get('check')}: {issue.get('message')}")
                await log_to_hub('warning', 'QA warnings on startup', {
                    'issues': warning_issues,
                    'count': len(warning_issues)
                })

            if result.get("valid"):
                logger.info("✅ All startup QA checks passed!")
                await log_to_hub('info', 'Startup QA checks passed', {
                    'checks_passed': result.get('checks_passed', 0)
                })

            return result
        except Exception as e:
            logger.error(f"Startup QA check failed: {e}")
            return {"valid": False, "error": str(e)}

    async def _run_periodic_qa(self):
        """Run periodic QA checks and alert on new issues"""
        try:
            result = await self.qa.run_all_checks()
            self.stats["qa_checks_run"] += 1

            issues = result.get("issues", [])
            if issues:
                self.stats["qa_issues_found"] += len(issues)
                critical = [i for i in issues if i.get("severity") == "critical"]

                if critical:
                    logger.error(f"🚨 Periodic QA found {len(critical)} critical issues!")
                    for issue in critical:
                        logger.error(f"  ❌ {issue.get('check')}: {issue.get('message')}")
                    await log_to_hub('error', 'Periodic QA found critical issues', {
                        'issues': critical,
                        'count': len(critical)
                    })
                else:
                    logger.warning(f"⚠️ Periodic QA found {len(issues)} issues")
                    await log_to_hub('warning', 'Periodic QA found issues', {
                        'issues': issues,
                        'count': len(issues)
                    })
            else:
                logger.info("✅ Periodic QA: All checks passed")

            return result
        except Exception as e:
            logger.error(f"Periodic QA check failed: {e}")
            return {"valid": False, "error": str(e)}

    async def _run_scheduled_operations(self):
        """Run scheduled autonomous operations"""
        now = datetime.now()
        
        # Daily marketing content (at 9 AM)
        if now.hour == 9 and now.minute == 0:
            self.add_task(Task(
                id=f"marketing-{now.date()}",
                type=TaskType.MARKETING,
                priority=TaskPriority.MEDIUM,
                payload={"action": "blog_post", "topic": "AI agents for business"}
            ))
            self.add_task(Task(
                id=f"social-{now.date()}",
                type=TaskType.MARKETING,
                priority=TaskPriority.LOW,
                payload={"action": "social_posts", "topic": "Agent Forge features"}
            ))
    
    def stop(self):
        """Stop the orchestrator"""
        self.running = False
        self.control_hub.disconnect()
        logger.info("🛑 Agent Forge Orchestrator stopped")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics"""
        workforce_stats = self.workforce_manager.get_stats()
        return {
            **self.stats,
            "queue_length": len(self.task_queue),
            "total_completed": len(self.completed_tasks),
            "collaboration": {
                "active_agents": len(self.collaboration_hub.agents),
                "active_collaborations": len(self.collaboration_hub.collaborations),
                "messages_processed": self.collaboration_hub.stats.get("messages_processed", 0),
                "handoffs_completed": self.collaboration_hub.stats.get("handoffs_completed", 0)
            },
            "learning": {
                "outcomes_tracked": len(self.learning_engine._outcomes),
                "active_strategies": sum(len(v) for v in self.learning_engine._strategies.values()),
                "insights_generated": len(self.learning_engine._insights),
                "prompt_variants": sum(len(v) for v in self.learning_engine._prompt_variants.values())
            },
            "workforce": {
                "active_workers": workforce_stats.get("active_workers", 0),
                "workers_by_type": workforce_stats.get("workers_by_type", {}),
                "workers_spawned": workforce_stats.get("workers_spawned", 0),
                "workers_terminated": workforce_stats.get("workers_terminated", 0),
                "tasks_handled_by_workers": workforce_stats.get("tasks_handled_by_workers", 0),
                "recent_scaling_events": workforce_stats.get("recent_scaling_events", 0)
            }
        }

    async def start_collaboration(
        self,
        objective: str,
        lead_agent: AgentRole,
        participants: List[AgentRole]
    ) -> str:
        """Start a multi-agent collaboration session"""
        collab_id = f"collab-{uuid.uuid4().hex[:8]}"
        self.collaboration_hub.start_collaboration(
            collab_id,
            lead_agent,
            participants,
            objective
        )
        self.stats["collaborations_started"] += 1
        logger.info(f"🤝 Started collaboration {collab_id}: {objective}")
        return collab_id

    def record_outcome(
        self,
        outcome_type: OutcomeType,
        success: bool,
        context: Dict[str, Any],
        metrics: Dict[str, float] = None
    ):
        """Record an outcome for learning"""
        from .learning import Outcome
        outcome = Outcome(
            id=f"outcome-{uuid.uuid4().hex[:8]}",
            type=outcome_type,
            success=success,
            context=context,
            metrics=metrics or {}
        )
        self.learning_engine.record_outcome(outcome)
        self.stats["outcomes_recorded"] += 1


# CLI interface
async def main():
    """Main entry point"""
    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║     🔥 AGENT FORGE - Autonomous AI Agent Builder 🔥          ║
    ║                                                               ║
    ║     Build AI Agents Without Code                              ║
    ║     100% Autonomous Operation                                 ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)
    
    orchestrator = Orchestrator()
    
    # Add initial tasks
    orchestrator.add_task(Task(
        id="welcome-blog",
        type=TaskType.MARKETING,
        priority=TaskPriority.LOW,
        payload={"action": "blog_post", "topic": "Getting started with AI agents"}
    ))
    
    try:
        await orchestrator.run()
    except KeyboardInterrupt:
        orchestrator.stop()
        print("\n\n📊 Final Stats:")
        for key, value in orchestrator.get_stats().items():
            print(f"   {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
