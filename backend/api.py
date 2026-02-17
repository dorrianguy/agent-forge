"""
Agent Forge - FastAPI Application
REST API for the autonomous AI agent builder platform
Production-ready with authentication, validation, and persistence
"""

import os
import uuid
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, EmailStr

from .orchestrator import Orchestrator, Task, TaskType, TaskPriority
from .universal_builder import UniversalAgentBuilder
from . import database as db
from .auth import get_api_key_auth, AuthResult, create_api_key, list_keys, revoke_key
from .billing import get_billing_manager, BillingManager
from .logging_config import get_logger

logger = get_logger('AgentForge.API')

# ==================== App Configuration ====================

# Allowed origins - configure via environment
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8000').split(',')

app = FastAPI(
    title="Agent Forge API",
    description="Autonomous AI Agent Builder Platform",
    version="1.0.0",
    docs_url="/docs" if os.environ.get('ENABLE_DOCS', 'true').lower() == 'true' else None,
    redoc_url="/redoc" if os.environ.get('ENABLE_DOCS', 'true').lower() == 'true' else None
)

# CORS - Restricted in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["X-API-Key", "Content-Type", "Authorization"],
)


# ==================== Request Logging Middleware ====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing"""
    start_time = time.time()

    # Get API key ID if present
    api_key = request.headers.get("X-API-Key", "")
    key_id = api_key.split(".")[0] if "." in api_key else None

    try:
        response = await call_next(request)

        # Log request
        response_time = (time.time() - start_time) * 1000
        db.log_request(
            api_key_id=key_id,
            endpoint=request.url.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=response_time
        )

        return response
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        db.log_request(
            api_key_id=key_id,
            endpoint=request.url.path,
            method=request.method,
            status_code=500,
            response_time_ms=response_time,
            error=str(e)
        )
        raise


# ==================== Global Instances ====================

_orchestrator: Optional[Orchestrator] = None
_builder: Optional[UniversalAgentBuilder] = None
_billing: Optional[BillingManager] = None


def get_orchestrator() -> Orchestrator:
    """Get or create the orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator


def get_builder() -> UniversalAgentBuilder:
    """Get or create the builder instance"""
    global _builder
    if _builder is None:
        _builder = UniversalAgentBuilder()
    return _builder


def get_billing() -> BillingManager:
    """Get or create the billing manager instance"""
    global _billing, _orchestrator
    if _billing is None:
        config = _orchestrator.config if _orchestrator else {}
        _billing = get_billing_manager(config)
    return _billing


# ==================== Request/Response Models with Validation ====================

class TaskRequest(BaseModel):
    type: str = Field(..., description="Task type: marketing, sales, support, build, deploy")
    priority: str = Field("MEDIUM", description="Priority: CRITICAL, HIGH, MEDIUM, LOW")
    payload: Dict[str, Any] = Field(default_factory=dict)

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['marketing', 'sales', 'support', 'build', 'deploy', 'qa']
        if v not in valid_types:
            raise ValueError(f"Invalid type. Must be one of: {valid_types}")
        return v

    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        if v.upper() not in valid_priorities:
            raise ValueError(f"Invalid priority. Must be one of: {valid_priorities}")
        return v.upper()


class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str


class SalesConversationRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=10000)
    history: List[Dict[str, str]] = Field(default_factory=list)

    @validator('history')
    def validate_history(cls, v):
        if len(v) > 50:
            raise ValueError("History too long. Maximum 50 messages.")
        return v


class SupportRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    customer_context: Dict[str, Any] = Field(default_factory=dict)


class LeadRequest(BaseModel):
    lead_data: Dict[str, Any] = Field(..., min_length=1)

    @validator('lead_data')
    def validate_lead_data(cls, v):
        if not v:
            raise ValueError("lead_data cannot be empty")
        return v


class BuildAgentRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=5000)
    requirements: List[str] = Field(default_factory=list)
    company_info: Dict[str, Any] = Field(default_factory=dict)

    @validator('requirements')
    def validate_requirements(cls, v):
        if len(v) > 20:
            raise ValueError("Maximum 20 requirements allowed")
        return v


class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    permissions: List[str] = Field(default=['read', 'write'])


# Billing models
class CreateCustomerRequest(BaseModel):
    email: EmailStr = Field(..., description="Customer email address")
    name: Optional[str] = Field(None, max_length=255)


class CreateCheckoutRequest(BaseModel):
    customer_id: str = Field(..., min_length=1)
    plan: str = Field(..., description="Plan: starter, professional, enterprise")
    success_url: str = Field(..., min_length=1)
    cancel_url: str = Field(..., min_length=1)

    @validator('plan')
    def validate_plan(cls, v):
        valid_plans = ['starter', 'professional', 'enterprise']
        if v not in valid_plans:
            raise ValueError(f"Invalid plan. Must be one of: {valid_plans}")
        return v


class SubscriptionActionRequest(BaseModel):
    subscription_id: str = Field(..., min_length=1)
    action: str = Field(..., description="Action: cancel, update")
    new_plan: Optional[str] = None
    immediately: bool = False


# ==================== Health & Status (Public) ====================

@app.get("/health")
async def health_check():
    """Health check endpoint - no auth required"""
    checks = {
        "database": False,
        "stripe": False
    }

    # Check database connectivity
    try:
        db.get_request_stats()  # Simple query to test connection
        checks["database"] = True
    except Exception as e:
        logger.error(f"Health check - database failed: {e}")

    # Check Stripe configuration
    try:
        billing = get_billing()
        checks["stripe"] = billing.is_configured()
    except Exception as e:
        logger.error(f"Health check - Stripe failed: {e}")

    # Determine overall status
    all_healthy = all(checks.values())
    critical_healthy = checks["database"]  # Database is critical

    return {
        "status": "healthy" if critical_healthy else "unhealthy",
        "service": "agent-forge",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "checks": checks,
        "degraded": not all_healthy and critical_healthy
    }


@app.get("/stats")
async def get_stats(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get system statistics"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    stats = orchestrator.get_stats()
    stats['request_stats'] = db.get_request_stats()
    return stats


# ==================== API Key Management (Admin) ====================

@app.post("/auth/keys")
async def create_new_api_key(
    request: CreateApiKeyRequest,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Create a new API key (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = create_api_key(request.name, request.permissions)
    logger.info(f"API key created: {result['key_id']} by {auth.key_id}")
    return result


@app.get("/auth/keys")
async def list_api_keys(auth: AuthResult = Depends(get_api_key_auth)):
    """List all API keys (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    return db.list_api_keys()


@app.delete("/auth/keys/{key_id}")
async def delete_api_key(key_id: str, auth: AuthResult = Depends(get_api_key_auth)):
    """Revoke an API key (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    return await revoke_key(key_id, auth)


# ==================== Agent Building ====================

@app.post("/agents/build")
async def build_agent(
    request: BuildAgentRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    builder: UniversalAgentBuilder = Depends(get_builder),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Build a new AI agent from natural language description.

    AUTOMATICALLY triggers the full workflow system with 12 Claude skills:
    - Planning phase: launch-planner, roadmap-builder, idea-validator
    - Architecture phase: adr-builder, api-devex-architect, security-threat-modeler
    - Development phase: design-guide, marketing-writer
    - Quality phase: test-engineer, test-quality-gatekeeper
    - Operations phase: prodops-optimizer, saas-deployment-ops
    """
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # AUTOMATICALLY start the workflow system with all Claude skills
        workflow_id = f"build-{uuid.uuid4().hex[:8]}"
        project_config = {
            "name": request.description[:50] if request.description else "New Agent",
            "description": request.description,
            "type": "agent",
            "features": request.requirements or [],
            "requirements": request.requirements or []
        }

        # Start workflow - this activates all 12 Claude skills automatically
        workflow_result = await orchestrator.workflow.start_workflow(workflow_id, project_config)
        logger.info(f"Workflow auto-started: {workflow_id} with {workflow_result['tasks_created']} tasks")

        # Build the agent using universal builder
        agent = await builder.build_agent(
            description=request.description,
            requirements=request.requirements if request.requirements else None,
            company_info=request.company_info if request.company_info else None
        )

        # Save to database
        agent_data = {
            'id': agent.spec.id,
            'name': agent.spec.name,
            'type': agent.spec.type.value,
            'description': agent.spec.description,
            'capabilities': [c.value for c in agent.spec.capabilities],
            'system_prompt': agent.spec.system_prompt,
            'knowledge_base': agent.spec.knowledge_base,
            'config': agent.config,
            'code': agent.code,
            'embed_code': agent.embed_code,
            'api_endpoint': agent.api_endpoint,
            'created_at': agent.spec.created_at.isoformat(),
            'workflow_id': workflow_id  # Link to workflow
        }
        db.save_agent(agent_data)

        # Record outcome for learning
        db.save_outcome({
            'outcome_type': 'agent_build',
            'action': 'build_agent',
            'context': {'description': request.description[:200], 'workflow_id': workflow_id},
            'result': {'agent_id': agent.spec.id, 'type': agent.spec.type.value, 'workflow_tasks': workflow_result['tasks_created']},
            'success': True,
            'score': 1.0
        })

        logger.info(f"Agent built: {agent.spec.id} ({agent.spec.name}) by {auth.key_id} with workflow {workflow_id}")

        return {
            "success": True,
            "agent": {
                "id": agent.spec.id,
                "name": agent.spec.name,
                "type": agent.spec.type.value,
                "description": agent.spec.description,
                "capabilities": [c.value for c in agent.spec.capabilities],
                "created_at": agent.spec.created_at.isoformat(),
                "api_endpoint": agent.api_endpoint,
                "embed_code": agent.embed_code[:500] + "..." if len(agent.embed_code) > 500 else agent.embed_code
            },
            "workflow": {
                "id": workflow_id,
                "status": workflow_result["status"],
                "tasks_created": workflow_result["tasks_created"],
                "phases": workflow_result.get("phases", []),
                "message": "Workflow auto-activated with 12 Claude skills"
            }
        }
    except KeyError as e:
        logger.error(f"Resource not found while building agent: {e}")
        db.save_outcome({
            'outcome_type': 'agent_build',
            'action': 'build_agent',
            'context': {'description': request.description[:200]},
            'result': {'error': str(e)},
            'success': False,
            'score': 0.0
        })
        raise HTTPException(status_code=404, detail="Resource not found")
    except ValueError as e:
        logger.error(f"Validation error while building agent: {e}")
        db.save_outcome({
            'outcome_type': 'agent_build',
            'action': 'build_agent',
            'context': {'description': request.description[:200]},
            'result': {'error': str(e)},
            'success': False,
            'score': 0.0
        })
        raise HTTPException(status_code=400, detail=str(e))
    except TypeError as e:
        logger.error(f"Invalid data type while building agent: {e}")
        db.save_outcome({
            'outcome_type': 'agent_build',
            'action': 'build_agent',
            'context': {'description': request.description[:200]},
            'result': {'error': str(e)},
            'success': False,
            'score': 0.0
        })
        raise HTTPException(status_code=400, detail="Invalid data type")
    except Exception as e:
        logger.error(f"Failed to build agent: {e}")
        db.save_outcome({
            'outcome_type': 'agent_build',
            'action': 'build_agent',
            'context': {'description': request.description[:200]},
            'result': {'error': str(e)},
            'success': False,
            'score': 0.0
        })
        raise HTTPException(status_code=500, detail=f"Failed to build agent: {str(e)}")


@app.get("/agents")
async def list_agents(
    agent_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    auth: AuthResult = Depends(get_api_key_auth)
):
    """List all agents"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    agents = db.list_agents(agent_type=agent_type, limit=limit)
    return {"count": len(agents), "agents": agents}


@app.get("/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get agent by ID"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    agent = db.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return agent


@app.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Delete an agent"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    if db.delete_agent(agent_id):
        logger.info(f"Agent deleted: {agent_id} by {auth.key_id}")
        return {"success": True, "message": f"Agent {agent_id} deleted"}

    raise HTTPException(status_code=404, detail="Agent not found")


# ==================== Task Management ====================

@app.post("/tasks", response_model=TaskResponse)
async def create_task(
    request: TaskRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Submit a new task to the orchestrator"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    task_type = TaskType(request.type)
    priority = TaskPriority[request.priority]

    task = Task(
        id=str(uuid.uuid4()),
        type=task_type,
        priority=priority,
        payload=request.payload
    )

    # Save to database
    db.save_task({
        'id': task.id,
        'type': task.type.value,
        'priority': task.priority.name,
        'payload': task.payload,
        'status': 'pending',
        'created_at': task.created_at.isoformat()
    })

    orchestrator.add_task(task)
    logger.info(f"Task created: {task.id} ({task.type.value}) by {auth.key_id}")

    return TaskResponse(
        task_id=task.id,
        status="queued",
        message=f"Task {task.type.value} added to queue"
    )


@app.get("/tasks/{task_id}")
async def get_task(
    task_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get task by ID"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    task = db.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@app.get("/tasks/queue/pending")
async def get_pending_tasks(
    limit: int = Query(default=20, le=100),
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get pending tasks"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    tasks = db.get_pending_tasks(limit=limit)
    return {"count": len(tasks), "tasks": tasks}


# ==================== Sales Endpoints ====================

@app.post("/sales/qualify")
async def qualify_lead(
    request: LeadRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Qualify a sales lead"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    try:
        result = await orchestrator.sales.qualify_lead(request.lead_data)

        # Record outcome for learning
        db.save_outcome({
            'outcome_type': 'lead_qualification',
            'action': 'qualify_lead',
            'context': request.lead_data,
            'result': result,
            'success': result.get('qualified', False),
            'score': result.get('score', 0.5)
        })

        return result
    except KeyError as e:
        logger.error(f"Resource not found in lead qualification: {e}")
        raise HTTPException(status_code=404, detail="Resource not found")
    except ValueError as e:
        logger.error(f"Validation error in lead qualification: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except TypeError as e:
        logger.error(f"Invalid data type in lead qualification: {e}")
        raise HTTPException(status_code=400, detail="Invalid data type")


@app.post("/sales/conversation")
async def sales_conversation(
    request: SalesConversationRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Handle a sales conversation"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    try:
        conversation_id = request.conversation_id or str(uuid.uuid4())
        result = await orchestrator.sales.handle_sales_conversation(
            conversation_id,
            request.message,
            request.history
        )

        return result
    except KeyError as e:
        logger.error(f"Resource not found in sales conversation: {e}")
        raise HTTPException(status_code=404, detail="Resource not found")
    except ValueError as e:
        logger.error(f"Validation error in sales conversation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except TypeError as e:
        logger.error(f"Invalid data type in sales conversation: {e}")
        raise HTTPException(status_code=400, detail="Invalid data type")


# ==================== Support Endpoints ====================

@app.post("/support")
async def handle_support(
    request: SupportRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Handle a support request"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    try:
        result = await orchestrator.support.handle_support_request(
            request.message,
            request.customer_context
        )

        # Record outcome for learning
        db.save_outcome({
            'outcome_type': 'support_request',
            'action': 'handle_support',
            'context': {'message': request.message[:200]},
            'result': {'category': result.get('category', 'unknown')},
            'success': True,
            'score': 0.8
        })

        return result
    except KeyError as e:
        logger.error(f"Resource not found in support request: {e}")
        raise HTTPException(status_code=404, detail="Resource not found")
    except ValueError as e:
        logger.error(f"Validation error in support request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except TypeError as e:
        logger.error(f"Invalid data type in support request: {e}")
        raise HTTPException(status_code=400, detail="Invalid data type")


# ==================== Marketing Endpoints ====================

@app.post("/marketing/blog")
async def generate_blog(
    topic: str = Query(..., min_length=3, max_length=500),
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Generate a blog post"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    try:
        result = await orchestrator.marketing.generate_blog_post(topic)

        # Record outcome
        db.save_outcome({
            'outcome_type': 'content_generation',
            'action': 'generate_blog',
            'context': {'topic': topic},
            'result': {'word_count': len(result.get('content', '').split())},
            'success': True,
            'score': 0.9
        })

        return result
    except KeyError as e:
        logger.error(f"Resource not found in blog generation: {e}")
        raise HTTPException(status_code=404, detail="Resource not found")
    except ValueError as e:
        logger.error(f"Validation error in blog generation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except TypeError as e:
        logger.error(f"Invalid data type in blog generation: {e}")
        raise HTTPException(status_code=400, detail="Invalid data type")


@app.post("/marketing/social")
async def generate_social(
    topic: str = Query(..., min_length=3, max_length=500),
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Generate social media posts"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    try:
        result = await orchestrator.marketing.generate_social_posts(topic)
        return result
    except KeyError as e:
        logger.error(f"Resource not found in social post generation: {e}")
        raise HTTPException(status_code=404, detail="Resource not found")
    except ValueError as e:
        logger.error(f"Validation error in social post generation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except TypeError as e:
        logger.error(f"Invalid data type in social post generation: {e}")
        raise HTTPException(status_code=400, detail="Invalid data type")


# ==================== Workforce Endpoints ====================

@app.get("/workforce/stats")
async def workforce_stats(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get workforce manager statistics"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    # Get both in-memory and database stats
    manager_stats = orchestrator.workforce_manager.get_stats()
    db_stats = db.get_worker_stats()

    return {
        **manager_stats,
        "database": db_stats
    }


@app.get("/workforce/workers")
async def list_workforce_workers(
    worker_type: Optional[str] = None,
    status: Optional[str] = None,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """List workers (both in-memory and persisted)"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    # In-memory workers
    in_memory = orchestrator.workforce_manager.workers
    in_memory_list = [
        {
            "id": w.id,
            "type": w.type.value,
            "status": w.status,
            "assigned_to": w.assigned_to,
            "tasks_completed": w.tasks_completed,
            "spawned_at": w.spawned_at.isoformat(),
            "last_active": w.last_active.isoformat(),
            "performance_score": w.performance_score
        }
        for w in in_memory.values()
    ]

    # Persisted workers
    persisted = db.list_workers(worker_type=worker_type, status=status)

    return {
        "active_count": len(in_memory_list),
        "active_workers": in_memory_list,
        "persisted_workers": persisted
    }


@app.get("/workforce/scaling-events")
async def get_scaling_events(
    limit: int = Query(default=50, le=200),
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get scaling event history"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    events = db.get_scaling_events(limit=limit)
    return {"count": len(events), "events": events}


@app.post("/workforce/spawn")
async def manually_spawn_worker(
    worker_type: str = Query(..., description="Worker type to spawn"),
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Manually spawn a worker (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    from .workforce import WorkerType, ScalingTrigger

    try:
        wtype = WorkerType(worker_type)
    except ValueError:
        valid_types = [t.value for t in WorkerType]
        raise HTTPException(400, f"Invalid worker type. Valid: {valid_types}")

    worker = await orchestrator.workforce_manager.spawn_worker(
        wtype,
        ScalingTrigger.MANUAL,
        f"Manually spawned by {auth.key_id}"
    )

    return {
        "success": True,
        "worker": {
            "id": worker.id,
            "type": worker.type.value,
            "status": worker.status,
            "assigned_to": worker.assigned_to
        }
    }


@app.delete("/workforce/workers/{worker_id}")
async def terminate_worker(
    worker_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Terminate a worker (admin only)"""
    if not auth.authenticated or 'admin' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Admin access required")

    worker = orchestrator.workforce_manager.workers.get(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    await orchestrator.workforce_manager.terminate_worker(worker_id, f"Terminated by {auth.key_id}")

    return {"success": True, "message": f"Worker {worker_id} terminated"}


# ==================== Collaboration Endpoints ====================

@app.get("/collaboration/stats")
async def collaboration_stats(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get collaboration hub statistics"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    hub = orchestrator.collaboration_hub
    return {
        "active_agents": len(hub.agents),
        "active_collaborations": len(hub.collaborations),
        "stats": hub.stats
    }


# ==================== Learning Endpoints ====================

@app.get("/learning/stats")
async def learning_stats(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get learning engine statistics"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    # Get from database
    outcomes = db.get_outcomes(limit=1000)
    strategies = db.get_strategies()

    engine = orchestrator.learning_engine
    return {
        "outcomes_tracked": len(outcomes),
        "strategies": len(strategies),
        "insights": len(engine._insights),
        "recent_outcomes": outcomes[:10]
    }


@app.get("/learning/outcomes")
async def get_learning_outcomes(
    outcome_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get learning outcomes"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    outcomes = db.get_outcomes(outcome_type=outcome_type, limit=limit)
    return {"count": len(outcomes), "outcomes": outcomes}


@app.get("/learning/strategies")
async def get_strategies(
    strategy_type: Optional[str] = None,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get learning strategies"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    strategies = db.get_strategies(strategy_type=strategy_type)
    return {"count": len(strategies), "strategies": strategies}


# ==================== Config Endpoints ====================

@app.get("/config")
async def get_config(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get current configuration"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    # Return config without sensitive data
    config = orchestrator.config.copy()
    return config


@app.get("/config/ai")
async def get_ai_config(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get AI model configuration"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    return orchestrator.config.get('ai', {})


# ==================== Billing Endpoints ====================

@app.get("/billing/plans")
async def get_billing_plans(
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get available pricing plans (public)"""
    config = orchestrator.config
    pricing = config.get('pricing', {})
    plans = pricing.get('plans', {})

    return {
        "currency": pricing.get('currency', 'USD'),
        "plans": plans
    }


@app.get("/billing/status")
async def get_billing_status(
    billing: BillingManager = Depends(get_billing)
):
    """Check if Stripe billing is configured"""
    return {
        "configured": billing.is_configured(),
        "plans_available": list(billing.price_ids.keys())
    }


@app.post("/billing/customers")
async def create_billing_customer(
    request: CreateCustomerRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Create a new customer in Stripe and local database"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if not billing.is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured")

    # Create in Stripe
    result = billing.create_customer(
        email=request.email,
        name=request.name,
        metadata={'created_by': auth.key_id}
    )

    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))

    # Save to local database
    customer_id = str(uuid.uuid4())
    db.create_customer({
        'id': customer_id,
        'email': request.email,
        'name': request.name,
        'stripe_customer_id': result['customer_id']
    })

    # Record event
    db.save_subscription_event({
        'customer_id': customer_id,
        'event_type': 'customer_created',
        'metadata': {'stripe_customer_id': result['customer_id']}
    })

    logger.info(f"Customer created: {customer_id} ({request.email})")

    return {
        "success": True,
        "customer_id": customer_id,
        "stripe_customer_id": result['customer_id']
    }


@app.get("/billing/customers/{customer_id}")
async def get_billing_customer(
    customer_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get customer billing details"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    customer = db.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return customer


@app.post("/billing/checkout")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Create a Stripe Checkout session for subscription"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if not billing.is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured")

    # Get customer
    customer = db.get_customer(request.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not customer.get('stripe_customer_id'):
        raise HTTPException(status_code=400, detail="Customer has no Stripe account")

    result = billing.create_checkout_session(
        customer_id=customer['stripe_customer_id'],
        plan=request.plan,
        success_url=request.success_url,
        cancel_url=request.cancel_url
    )

    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))

    logger.info(f"Checkout session created for customer {request.customer_id}, plan {request.plan}")

    return result


@app.get("/billing/checkout/{session_id}")
async def get_checkout_session(
    session_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Verify and retrieve checkout session details"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if not billing.is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured")

    try:
        import stripe
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "session_id": session.id,
            "status": session.status,
            "payment_status": session.payment_status,
            "customer_id": session.customer,
            "subscription_id": session.subscription,
            "plan": session.metadata.get('plan') if session.metadata else None
        }
    except stripe.StripeError as e:
        logger.error(f"Failed to retrieve checkout session {session_id}: {e}")
        raise HTTPException(status_code=404, detail="Checkout session not found")


@app.get("/billing/customers/{customer_id}/subscriptions")
async def get_customer_subscriptions(
    customer_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Get customer's subscriptions"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    customer = db.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not customer.get('stripe_customer_id'):
        return {"subscriptions": []}

    subscriptions = billing.list_customer_subscriptions(customer['stripe_customer_id'])
    return {"subscriptions": subscriptions}


@app.post("/billing/subscriptions/action")
async def subscription_action(
    request: SubscriptionActionRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Cancel or update a subscription"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if not billing.is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured")

    if request.action == 'cancel':
        result = billing.cancel_subscription(
            request.subscription_id,
            immediately=request.immediately
        )
    elif request.action == 'update':
        if not request.new_plan:
            raise HTTPException(status_code=400, detail="new_plan required for update action")
        result = billing.update_subscription(
            request.subscription_id,
            request.new_plan
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use: cancel, update")

    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))

    return result


@app.get("/billing/customers/{customer_id}/invoices")
async def get_customer_invoices(
    customer_id: str,
    limit: int = Query(default=10, le=100),
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Get customer's invoice history"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    customer = db.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not customer.get('stripe_customer_id'):
        return {"invoices": []}

    invoices = billing.list_invoices(customer['stripe_customer_id'], limit=limit)
    return {"invoices": invoices}


@app.get("/billing/customers/{customer_id}/payment-methods")
async def get_customer_payment_methods(
    customer_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Get customer's payment methods"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    customer = db.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not customer.get('stripe_customer_id'):
        return {"payment_methods": []}

    payment_methods = billing.list_payment_methods(customer['stripe_customer_id'])
    return {"payment_methods": payment_methods}


@app.post("/billing/portal")
async def create_billing_portal(
    customer_id: str = Query(...),
    return_url: str = Query(...),
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Create a Stripe Customer Portal session"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    if not billing.is_configured():
        raise HTTPException(status_code=503, detail="Stripe not configured")

    customer = db.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not customer.get('stripe_customer_id'):
        raise HTTPException(status_code=400, detail="Customer has no Stripe account")

    result = billing.create_portal_session(
        customer['stripe_customer_id'],
        return_url
    )

    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))

    return result


@app.get("/billing/customers/{customer_id}/usage")
async def check_customer_usage(
    customer_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    billing: BillingManager = Depends(get_billing)
):
    """Check if customer is within usage limits"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    customer = db.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    limits = billing.check_usage_limits(
        plan=customer.get('current_plan', 'free'),
        current_agents=customer.get('agents_count', 0),
        current_conversations=customer.get('conversations_count', 0)
    )

    return {
        "plan": customer.get('current_plan'),
        "usage": {
            "agents": customer.get('agents_count', 0),
            "conversations": customer.get('conversations_count', 0)
        },
        "limits": limits
    }


# ==================== Stripe Webhook ====================

@app.post("/billing/webhook")
async def stripe_webhook(
    request: Request,
    billing: BillingManager = Depends(get_billing)
):
    """Handle Stripe webhook events"""
    # Get raw body for signature verification
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    # Verify webhook
    event = billing.verify_webhook(payload, sig_header)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # Process event
    result = billing.handle_webhook_event(event)
    action = result.get('action')

    # Update local database based on event
    if action == 'subscription_created':
        customer = db.get_customer_by_stripe_id(result.get('customer_id'))
        if customer:
            db.update_customer_subscription(
                customer['id'],
                plan=result.get('plan', 'unknown'),
                status=result.get('status', 'active'),
                subscription_id=result.get('subscription_id')
            )
            db.save_subscription_event({
                'customer_id': customer['id'],
                'event_type': 'subscription_created',
                'new_plan': result.get('plan'),
                'stripe_event_id': event.get('type')
            })
            logger.info(f"Subscription created for customer {customer['id']}")

    elif action == 'subscription_updated':
        customer = db.get_customer_by_stripe_id(result.get('customer_id'))
        if customer:
            old_plan = customer.get('current_plan')
            db.update_customer_subscription(
                customer['id'],
                plan=result.get('plan', customer.get('current_plan')),
                status=result.get('status', 'active'),
                subscription_id=result.get('subscription_id')
            )
            db.save_subscription_event({
                'customer_id': customer['id'],
                'event_type': 'subscription_updated',
                'old_plan': old_plan,
                'new_plan': result.get('plan'),
                'metadata': {'cancel_at_period_end': result.get('cancel_at_period_end')}
            })
            logger.info(f"Subscription updated for customer {customer['id']}")

    elif action == 'subscription_deleted':
        customer = db.get_customer_by_stripe_id(result.get('customer_id'))
        if customer:
            old_plan = customer.get('current_plan')
            db.update_customer_subscription(
                customer['id'],
                plan='free',
                status='cancelled',
                subscription_id=None
            )
            db.save_subscription_event({
                'customer_id': customer['id'],
                'event_type': 'subscription_cancelled',
                'old_plan': old_plan,
                'new_plan': 'free'
            })
            logger.info(f"Subscription cancelled for customer {customer['id']}")

    elif action == 'payment_succeeded':
        customer = db.get_customer_by_stripe_id(result.get('customer_id'))
        if customer:
            db.save_subscription_event({
                'customer_id': customer['id'],
                'event_type': 'payment_succeeded',
                'metadata': {
                    'invoice_id': result.get('invoice_id'),
                    'amount_paid': result.get('amount_paid')
                }
            })
            logger.info(f"Payment succeeded for customer {customer['id']}")

    elif action == 'payment_failed':
        customer = db.get_customer_by_stripe_id(result.get('customer_id'))
        if customer:
            db.update_customer_subscription(
                customer['id'],
                plan=customer.get('current_plan'),
                status='past_due'
            )
            db.save_subscription_event({
                'customer_id': customer['id'],
                'event_type': 'payment_failed',
                'metadata': {
                    'invoice_id': result.get('invoice_id'),
                    'amount_due': result.get('amount_due')
                }
            })
            logger.warning(f"Payment failed for customer {customer['id']}")

    elif action == 'checkout_completed':
        customer = db.get_customer_by_stripe_id(result.get('customer_id'))
        if customer:
            db.update_customer_subscription(
                customer['id'],
                plan=result.get('plan', 'unknown'),
                status='active',
                subscription_id=result.get('subscription_id')
            )
            db.save_subscription_event({
                'customer_id': customer['id'],
                'event_type': 'checkout_completed',
                'new_plan': result.get('plan'),
                'metadata': {'session_id': result.get('session_id')}
            })
            logger.info(f"Checkout completed for customer {customer['id']}")

    return {"received": True, "action": action}


# ==================== QA Endpoints ====================

@app.get("/qa/run")
async def run_qa_checks(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Run all QA validation checks"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    result = await orchestrator.qa.run_all_checks()
    return result


@app.get("/qa/payment-flow")
async def validate_payment_flow(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Validate payment flow specifically"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    result = await orchestrator.qa.validate_payment_flow()
    return result


@app.get("/qa/status")
async def get_qa_status(
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get QA engine status (public)"""
    return orchestrator.qa.get_status()


# ==================== Workflow Endpoints ====================

class StartWorkflowRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")
    type: str = Field(default="app", description="Project type: app, saas, api, agent")
    features: List[str] = Field(default_factory=list)


@app.post("/workflow/start")
async def start_workflow(
    request: StartWorkflowRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """
    Start an automated development workflow.
    This AUTOMATICALLY breaks down the project into tasks and assigns them
    to agents based on Claude skills.
    """
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    project_id = f"workflow-{uuid.uuid4().hex[:8]}"
    project_config = {
        "name": request.name,
        "description": request.description,
        "type": request.type,
        "features": request.features
    }

    result = await orchestrator.workflow.start_workflow(project_id, project_config)
    logger.info(f"Workflow started: {project_id} with {result['tasks_created']} tasks")

    return result


@app.get("/workflow/{workflow_id}")
async def get_workflow_status(
    workflow_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Get status of a running workflow"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    status = orchestrator.workflow.get_workflow_status(workflow_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return status


@app.get("/workflow")
async def list_workflows(
    auth: AuthResult = Depends(get_api_key_auth),
    orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """List all active workflows"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error)

    workflows = []
    for wf_id, wf in orchestrator.workflow.active_workflows.items():
        workflows.append({
            "id": wf_id,
            "status": wf["status"],
            "current_phase": wf["current_phase"],
            "started_at": wf["started_at"],
            "tasks_count": len(wf["tasks"])
        })

    return {"workflows": workflows, "count": len(workflows)}


@app.get("/workflow/skills")
async def get_available_skills():
    """Get list of available Claude skills for workflows (public)"""
    from .orchestrator import AppDevelopmentWorkflow

    skills = []
    for skill_name, skill_info in AppDevelopmentWorkflow.SKILL_MAPPING.items():
        skills.append({
            "name": skill_name,
            "phase": skill_info["phase"].value,
            "role": skill_info["role"].value,
            "description": skill_info["description"]
        })

    return {"skills": skills, "count": len(skills)}


# ==================== Startup/Shutdown Events ====================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    import asyncio

    # Initialize database
    db.init_database()
    logger.info("Database initialized")

    # Initialize orchestrator
    orchestrator = get_orchestrator()

    # Start orchestrator run loop
    asyncio.create_task(orchestrator.run())
    logger.info("Orchestrator started")

    # Log startup
    logger.info(f"Agent Forge API started. CORS origins: {ALLOWED_ORIGINS}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global _orchestrator
    if _orchestrator:
        _orchestrator.stop()
    logger.info("Agent Forge API stopped")


# ==================== Error Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500
        }
    )
