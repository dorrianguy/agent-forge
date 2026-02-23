"""
Shared pytest fixtures for Agent Forge tests.
Provides mock clients, database setup, and authentication fixtures.
"""

import os
import sys
import pytest
import tempfile
import sqlite3
from unittest.mock import MagicMock, patch, AsyncMock
from typing import Generator, Dict, Any

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient


# ==================== Environment Fixtures ====================

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment variables before any tests run."""
    # Set test environment variables
    os.environ['ENVIRONMENT'] = 'test'
    os.environ['DEBUG'] = 'false'
    os.environ['LOG_LEVEL'] = 'WARNING'
    os.environ['DATABASE_PATH'] = ':memory:'
    os.environ['STRIPE_SECRET_KEY'] = ''
    os.environ['STRIPE_WEBHOOK_SECRET'] = ''
    os.environ['ANTHROPIC_API_KEY'] = 'test-key-for-testing'
    os.environ['AGENT_FORGE_MASTER_KEY'] = 'test-master-key-12345'
    yield
    # Cleanup if needed


@pytest.fixture
def temp_db_path() -> Generator[str, None, None]:
    """Create a temporary database file for testing."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name

    yield db_path

    # Cleanup
    try:
        os.unlink(db_path)
    except OSError:
        pass


# ==================== Database Fixtures ====================

@pytest.fixture
def mock_database():
    """
    Mock database module for testing.
    Returns a mock with all database functions.
    """
    mock_db = MagicMock()

    # Configure return values for common operations
    mock_db.get_request_stats.return_value = {
        'total_requests': 100,
        'by_status': {200: 90, 400: 5, 500: 5},
        'avg_response_time_ms': 45.5
    }

    mock_db.list_agents.return_value = []
    mock_db.get_agent.return_value = None
    mock_db.list_api_keys.return_value = []
    mock_db.get_pending_tasks.return_value = []
    mock_db.get_outcomes.return_value = []
    mock_db.get_strategies.return_value = []
    mock_db.get_worker_stats.return_value = {
        'total_workers': 0,
        'by_status': {},
        'by_type': {},
        'total_tasks_completed': 0
    }
    mock_db.get_scaling_events.return_value = []
    mock_db.get_customer.return_value = None
    mock_db.validate_api_key.return_value = None

    # Log request should not fail
    mock_db.log_request.return_value = None

    return mock_db


@pytest.fixture
def initialized_test_db(temp_db_path: str):
    """
    Create and initialize a real test database.
    Returns the database path.
    """
    # Temporarily set the database path
    original_path = os.environ.get('DATABASE_PATH')
    os.environ['DATABASE_PATH'] = temp_db_path

    # Import and initialize
    from backend import database as db
    db.DB_PATH = temp_db_path
    db.init_database()

    yield temp_db_path

    # Restore original path
    if original_path:
        os.environ['DATABASE_PATH'] = original_path


# ==================== API Key Fixtures ====================

@pytest.fixture
def mock_api_key() -> str:
    """Return a mock API key for testing."""
    return "afk_testkey123.testsecret456789"


@pytest.fixture
def mock_master_key() -> str:
    """Return the mock master key."""
    return os.environ.get('AGENT_FORGE_MASTER_KEY', 'test-master-key-12345')


@pytest.fixture
def mock_auth_result_authenticated():
    """Create a mock authenticated AuthResult."""
    from backend.auth import AuthResult
    return AuthResult(
        authenticated=True,
        key_data={
            'id': 'test_key_id',
            'name': 'Test Key',
            'permissions': ['read', 'write'],
            'rate_limit': 100
        }
    )


@pytest.fixture
def mock_auth_result_admin():
    """Create a mock authenticated AuthResult with admin permissions."""
    from backend.auth import AuthResult
    return AuthResult(
        authenticated=True,
        key_data={
            'id': 'admin_key_id',
            'name': 'Admin Key',
            'permissions': ['read', 'write', 'admin'],
            'rate_limit': 10000
        }
    )


@pytest.fixture
def mock_auth_result_read_only():
    """Create a mock authenticated AuthResult with read-only permissions."""
    from backend.auth import AuthResult
    return AuthResult(
        authenticated=True,
        key_data={
            'id': 'readonly_key_id',
            'name': 'Read Only Key',
            'permissions': ['read'],
            'rate_limit': 100
        }
    )


@pytest.fixture
def mock_auth_result_unauthenticated():
    """Create a mock unauthenticated AuthResult."""
    from backend.auth import AuthResult
    return AuthResult(
        authenticated=False,
        error="No API key provided"
    )


# ==================== FastAPI Test Client Fixtures ====================

@pytest.fixture
def mock_orchestrator():
    """Create a mock orchestrator for testing."""
    mock = MagicMock()
    mock.get_stats.return_value = {
        'tasks_processed': 0,
        'active_tasks': 0,
        'queue_size': 0
    }
    mock.config = {}
    mock.sales = MagicMock()
    mock.support = MagicMock()
    mock.marketing = MagicMock()
    mock.workforce_manager = MagicMock()
    mock.workforce_manager.workers = {}
    mock.workforce_manager.get_stats.return_value = {}
    mock.collaboration_hub = MagicMock()
    mock.collaboration_hub.agents = {}
    mock.collaboration_hub.collaborations = {}
    mock.collaboration_hub.stats = {}
    mock.learning_engine = MagicMock()
    mock.learning_engine._insights = []
    mock.qa = MagicMock()
    mock.qa.get_status.return_value = {'status': 'ready'}
    mock.workflow = MagicMock()
    mock.workflow.active_workflows = {}
    return mock


@pytest.fixture
def mock_builder():
    """Create a mock UniversalAgentBuilder for testing."""
    mock = MagicMock()
    mock.build_agent = AsyncMock()
    return mock


@pytest.fixture
def mock_billing():
    """Create a mock BillingManager for testing."""
    mock = MagicMock()
    mock.is_configured.return_value = False
    mock.price_ids = {}
    return mock


@pytest.fixture
def test_client(mock_database, mock_orchestrator, mock_builder, mock_billing):
    """
    Create a FastAPI test client with mocked dependencies.

    This fixture patches all the major dependencies to allow
    testing API endpoints in isolation.
    """
    with patch.dict('sys.modules', {'backend.database': mock_database}):
        with patch('backend.api.db', mock_database):
            with patch('backend.api.get_orchestrator', return_value=mock_orchestrator):
                with patch('backend.api.get_builder', return_value=mock_builder):
                    with patch('backend.api.get_billing', return_value=mock_billing):
                        from backend.api import app

                        # Disable startup/shutdown events for testing
                        app.router.on_startup.clear()
                        app.router.on_shutdown.clear()

                        client = TestClient(app, raise_server_exceptions=False)
                        yield client


@pytest.fixture
def authenticated_client(test_client, mock_master_key):
    """
    Create an authenticated test client using the master key.
    Returns a tuple of (client, headers).
    """
    headers = {"X-API-Key": mock_master_key}
    return test_client, headers


# ==================== Billing Fixtures ====================

@pytest.fixture
def mock_stripe():
    """Mock the stripe module for testing."""
    with patch('stripe.api_key', 'sk_test_mock'):
        with patch('stripe.Customer') as mock_customer:
            with patch('stripe.Subscription') as mock_subscription:
                with patch('stripe.checkout.Session') as mock_session:
                    mock_customer.create.return_value = MagicMock(
                        id='cus_test123',
                        email='test@example.com'
                    )
                    mock_customer.retrieve.return_value = MagicMock(
                        id='cus_test123',
                        email='test@example.com',
                        name='Test User',
                        created=1234567890,
                        metadata={}
                    )

                    yield {
                        'Customer': mock_customer,
                        'Subscription': mock_subscription,
                        'Session': mock_session
                    }


# ==================== Utility Fixtures ====================

@pytest.fixture
def sample_agent_data() -> Dict[str, Any]:
    """Return sample agent data for testing."""
    return {
        'id': 'agent_test_123',
        'name': 'Test Agent',
        'type': 'support',
        'description': 'A test agent for unit testing',
        'capabilities': ['conversation', 'analysis'],
        'system_prompt': 'You are a helpful test agent.',
        'knowledge_base': {},
        'config': {'model': 'test-model'},
        'code': 'class TestAgent: pass',
        'embed_code': '<script>test</script>',
        'api_endpoint': '/api/agents/agent_test_123'
    }


@pytest.fixture
def sample_task_data() -> Dict[str, Any]:
    """Return sample task data for testing."""
    return {
        'id': 'task_test_123',
        'type': 'support',
        'priority': 'MEDIUM',
        'payload': {'message': 'Test task'},
        'status': 'pending'
    }


@pytest.fixture
def sample_customer_data() -> Dict[str, Any]:
    """Return sample customer data for testing."""
    return {
        'id': 'customer_test_123',
        'email': 'test@example.com',
        'name': 'Test Customer',
        'stripe_customer_id': 'cus_test123',
        'current_plan': 'free',
        'subscription_status': 'inactive'
    }


# ==================== Async Fixtures ====================

@pytest.fixture
def event_loop():
    """Create an event loop for async tests."""
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
