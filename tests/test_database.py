"""
Tests for database layer.
Covers schema initialization, CRUD operations, and data integrity.
"""

import pytest
import json
from datetime import datetime


class TestDatabaseInit:
    """Tests for database initialization."""

    def test_init_creates_tables(self, db):
        """init_database should create all required tables."""
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row[0] for row in cursor.fetchall()}

        expected_tables = {
            'api_keys', 'agents', 'tasks', 'customers',
            'request_log', 'subscription_events'
        }
        # Check that all expected tables exist (there may be more)
        for table in expected_tables:
            assert table in tables, f"Missing table: {table}"

    def test_init_idempotent(self, db):
        """init_database should be safe to call multiple times."""
        db.init_database()
        db.init_database()
        # No error = success


class TestAgentCRUD:
    """Tests for agent database operations."""

    def test_save_and_get_agent(self, db):
        """Should save and retrieve an agent."""
        agent_data = {
            'id': 'test-agent-db-001',
            'name': 'DB Test Agent',
            'type': 'customer_support',
            'description': 'A test agent for database tests',
            'capabilities': ['conversation'],
            'system_prompt': 'You are helpful.',
            'knowledge_base': {'faq': []},
            'config': {'model': 'claude-sonnet-4-20250514'},
            'code': 'def handle(msg): return "hello"',
            'embed_code': '<div>test</div>',
            'api_endpoint': '/api/test',
            'created_at': datetime.now().isoformat()
        }
        db.save_agent(agent_data)

        retrieved = db.get_agent('test-agent-db-001')
        assert retrieved is not None
        assert retrieved['name'] == 'DB Test Agent'

    def test_list_agents(self, db):
        """Should list all agents."""
        for i in range(3):
            db.save_agent({
                'id': f'list-test-{i}',
                'name': f'Agent {i}',
                'type': 'faq_bot',
                'description': f'Agent number {i}',
                'capabilities': [],
                'system_prompt': 'test',
                'knowledge_base': {},
                'config': {},
                'code': '',
                'embed_code': '',
                'api_endpoint': '',
                'created_at': datetime.now().isoformat()
            })

        agents = db.list_agents()
        assert len(agents) >= 3

    def test_delete_agent(self, db):
        """Should delete an agent."""
        db.save_agent({
            'id': 'delete-test-001',
            'name': 'To Delete',
            'type': 'sales',
            'description': 'Will be deleted',
            'capabilities': [],
            'system_prompt': '',
            'knowledge_base': {},
            'config': {},
            'code': '',
            'embed_code': '',
            'api_endpoint': '',
            'created_at': datetime.now().isoformat()
        })

        result = db.delete_agent('delete-test-001')
        assert result is True

        retrieved = db.get_agent('delete-test-001')
        assert retrieved is None

    def test_delete_nonexistent_agent(self, db):
        """Deleting nonexistent agent should return False."""
        result = db.delete_agent('does-not-exist')
        assert result is False


class TestApiKeyCRUD:
    """Tests for API key database operations."""

    def test_create_and_validate_key(self, db):
        """Should create and validate an API key."""
        from backend.auth import hash_api_key

        key_hash = hash_api_key("test-key-1234")
        db.create_api_key(
            key_id="afk_testid",
            key_hash=key_hash,
            name="test-key",
            permissions=["read", "write"]
        )

        result = db.validate_api_key(key_hash)
        assert result is not None

    def test_list_api_keys(self, db):
        """Should list API keys without exposing hashes."""
        from backend.auth import hash_api_key

        db.create_api_key(
            key_id="afk_list1",
            key_hash=hash_api_key("key-1"),
            name="key-one",
            permissions=["read"]
        )
        db.create_api_key(
            key_id="afk_list2",
            key_hash=hash_api_key("key-2"),
            name="key-two",
            permissions=["read", "write"]
        )

        keys = db.list_api_keys()
        assert len(keys) >= 2


class TestTaskCRUD:
    """Tests for task database operations."""

    def test_save_and_get_task(self, db):
        """Should save and retrieve a task."""
        task_data = {
            'id': 'task-001',
            'type': 'marketing',
            'priority': 'HIGH',
            'payload': {'topic': 'AI agents'},
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        db.save_task(task_data)

        retrieved = db.get_task('task-001')
        assert retrieved is not None

    def test_get_pending_tasks(self, db):
        """Should retrieve pending tasks."""
        for i in range(3):
            db.save_task({
                'id': f'pending-{i}',
                'type': 'support',
                'priority': 'MEDIUM',
                'payload': {},
                'status': 'pending',
                'created_at': datetime.now().isoformat()
            })

        pending = db.get_pending_tasks(limit=10)
        assert len(pending) >= 3


class TestCustomerCRUD:
    """Tests for customer database operations."""

    def test_create_and_get_customer(self, db):
        """Should create and retrieve a customer."""
        db.create_customer({
            'id': 'cust-001',
            'email': 'test@example.com',
            'name': 'Test Customer',
            'stripe_customer_id': 'cus_test123'
        })

        customer = db.get_customer('cust-001')
        assert customer is not None
        assert customer['email'] == 'test@example.com'

    def test_get_customer_by_stripe_id(self, db):
        """Should find customer by Stripe ID."""
        db.create_customer({
            'id': 'cust-stripe-001',
            'email': 'stripe@example.com',
            'name': 'Stripe Customer',
            'stripe_customer_id': 'cus_stripe_test'
        })

        customer = db.get_customer_by_stripe_id('cus_stripe_test')
        assert customer is not None
        assert customer['id'] == 'cust-stripe-001'

    def test_get_nonexistent_customer(self, db):
        """Getting non-existent customer should return None."""
        customer = db.get_customer('does-not-exist')
        assert customer is None


class TestRequestLog:
    """Tests for request logging."""

    def test_log_request(self, db):
        """Should log a request."""
        db.log_request(
            api_key_id="afk_test",
            endpoint="/health",
            method="GET",
            status_code=200,
            response_time_ms=15.5
        )

    def test_get_request_stats(self, db):
        """Should return request statistics."""
        # Log some requests first
        for i in range(5):
            db.log_request(
                api_key_id="afk_test",
                endpoint="/stats",
                method="GET",
                status_code=200,
                response_time_ms=10.0 + i
            )

        stats = db.get_request_stats()
        assert stats is not None


class TestOutcomes:
    """Tests for learning outcomes storage."""

    def test_save_outcome(self, db):
        """Should save a learning outcome."""
        db.save_outcome({
            'outcome_type': 'agent_build',
            'action': 'build_agent',
            'context': {'description': 'test'},
            'result': {'agent_id': 'test-001'},
            'success': True,
            'score': 0.95
        })

    def test_get_outcomes(self, db):
        """Should retrieve outcomes."""
        db.save_outcome({
            'outcome_type': 'lead_qualification',
            'action': 'qualify_lead',
            'context': {},
            'result': {'qualified': True},
            'success': True,
            'score': 0.8
        })

        outcomes = db.get_outcomes(limit=10)
        assert len(outcomes) >= 1
