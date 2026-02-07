"""
Agent Forge - Test Configuration & Fixtures
Provides shared fixtures for all test modules.
"""

import os
import sys
import json
import pytest
import tempfile
import shutil
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Set test environment variables BEFORE importing anything
os.environ['DATABASE_PATH'] = ':memory:'
os.environ['ANTHROPIC_API_KEY'] = 'test-key-not-real'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_not_real'
os.environ['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_not_real'
os.environ['ALLOWED_ORIGINS'] = 'http://localhost:3000,http://localhost:8000'

from fastapi.testclient import TestClient


# --------------- Database Fixtures ---------------

@pytest.fixture(autouse=True)
def fresh_database(tmp_path):
    """Ensure each test gets a fresh database."""
    db_path = str(tmp_path / "test_agentforge.db")
    os.environ['DATABASE_PATH'] = db_path

    # Re-import to pick up new path
    from backend import database as db
    # Reset the module-level DB_PATH
    db.DB_PATH = db_path
    db.init_database()

    yield db

    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
def db(fresh_database):
    """Shorthand for the database module."""
    return fresh_database


# --------------- Auth Fixtures ---------------

@pytest.fixture
def admin_api_key(db):
    """Create an admin API key and return the full key string."""
    from backend.auth import create_api_key
    result = create_api_key("test-admin", permissions=["read", "write", "admin"])
    return result['api_key']


@pytest.fixture
def user_api_key(db):
    """Create a regular user API key and return the full key string."""
    from backend.auth import create_api_key
    result = create_api_key("test-user", permissions=["read", "write"])
    return result['api_key']


@pytest.fixture
def readonly_api_key(db):
    """Create a read-only API key and return the full key string."""
    from backend.auth import create_api_key
    result = create_api_key("test-readonly", permissions=["read"])
    return result['api_key']


# --------------- App Fixtures ---------------

@pytest.fixture
def mock_orchestrator():
    """Create a mock orchestrator that won't call real APIs."""
    mock = MagicMock()
    mock.config = {
        "business": {"name": "Agent Forge Test"},
        "ai": {"model": "claude-sonnet-4-20250514", "max_tokens": 1000},
        "pricing": {
            "currency": "USD",
            "plans": {
                "starter": {"price": 49, "agents": 1},
                "professional": {"price": 149, "agents": 5},
                "enterprise": {"price": 499, "agents": -1}
            }
        }
    }
    mock.get_stats.return_value = {
        "tasks_completed": 42,
        "agents_built": 10,
        "uptime_hours": 100
    }

    # Mock sub-engines
    mock.sales = MagicMock()
    mock.sales.qualify_lead = AsyncMock(return_value={
        "qualified": True, "score": 0.85, "reason": "Good fit"
    })
    mock.sales.handle_sales_conversation = AsyncMock(return_value={
        "response": "Great question!", "next_step": "demo"
    })

    mock.marketing = MagicMock()
    mock.marketing.generate_blog_post = AsyncMock(return_value={
        "title": "Test Blog Post",
        "content": "Test content here",
        "tags": ["test", "ai"]
    })
    mock.marketing.generate_social_posts = AsyncMock(return_value={
        "posts": [{"platform": "twitter", "content": "Test tweet"}]
    })

    mock.support = MagicMock()
    mock.support.handle_support_request = AsyncMock(return_value={
        "response": "Here's how to fix that...",
        "category": "technical"
    })

    mock.qa = MagicMock()
    mock.qa.run_all_checks = AsyncMock(return_value={
        "passed": 5, "failed": 0, "warnings": 1
    })
    mock.qa.validate_payment_flow = AsyncMock(return_value={
        "valid": True, "checks": []
    })
    mock.qa.get_status.return_value = {"last_run": None, "issues": []}

    mock.workflow = MagicMock()
    mock.workflow.start_workflow = AsyncMock(return_value={
        "status": "started",
        "tasks_created": 10,
        "phases": ["analysis", "planning", "architecture"]
    })
    mock.workflow.get_workflow_status.return_value = None
    mock.workflow.active_workflows = {}

    mock.workforce_manager = MagicMock()
    mock.workforce_manager.get_stats.return_value = {
        "total_workers": 3, "active": 2, "idle": 1
    }
    mock.workforce_manager.workers = {}

    mock.collaboration_hub = MagicMock()
    mock.collaboration_hub.agents = {}
    mock.collaboration_hub.collaborations = {}
    mock.collaboration_hub.stats = {"messages_sent": 0}

    mock.learning_engine = MagicMock()
    mock.learning_engine._insights = []

    mock.add_task = MagicMock()

    return mock


@pytest.fixture
def mock_builder():
    """Create a mock agent builder."""
    mock = MagicMock()
    mock.build_agent = AsyncMock()
    return mock


@pytest.fixture
def mock_billing():
    """Create a mock billing manager."""
    mock = MagicMock()
    mock.is_configured.return_value = True
    mock.price_ids = {"starter": "price_123", "professional": "price_456"}
    mock.create_customer.return_value = {
        "success": True, "customer_id": "cus_test123"
    }
    mock.create_checkout_session.return_value = {
        "success": True, "url": "https://checkout.stripe.com/test", "session_id": "cs_test123"
    }
    mock.list_customer_subscriptions.return_value = []
    mock.list_invoices.return_value = []
    mock.list_payment_methods.return_value = []
    mock.check_usage_limits.return_value = {
        "within_limits": True, "agents_remaining": 5
    }
    mock.cancel_subscription.return_value = {"success": True}
    mock.update_subscription.return_value = {"success": True}
    mock.create_portal_session.return_value = {
        "success": True, "url": "https://billing.stripe.com/test"
    }
    mock.verify_webhook.return_value = None
    return mock


@pytest.fixture
def client(db, mock_orchestrator, mock_builder, mock_billing):
    """Create a FastAPI TestClient with mocked dependencies."""
    from backend.api import app, get_orchestrator, get_builder, get_billing

    # Override dependency injection
    app.dependency_overrides[get_orchestrator] = lambda: mock_orchestrator
    app.dependency_overrides[get_builder] = lambda: mock_builder
    app.dependency_overrides[get_billing] = lambda: mock_billing

    with TestClient(app) as c:
        yield c

    # Clean up overrides
    app.dependency_overrides.clear()
