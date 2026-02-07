"""
Tests for agent CRUD endpoints.
Covers building, listing, getting, and deleting agents.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime


class TestListAgents:
    """Tests for GET /agents"""

    def test_list_agents_requires_auth(self, client):
        """Listing agents requires authentication."""
        response = client.get("/agents")
        assert response.status_code == 401

    def test_list_agents_empty(self, client, user_api_key):
        """Empty agent list should return count 0."""
        response = client.get(
            "/agents",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["agents"] == []

    def test_list_agents_with_type_filter(self, client, user_api_key):
        """Should accept agent_type query parameter."""
        response = client.get(
            "/agents?agent_type=customer_support",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200

    def test_list_agents_limit_parameter(self, client, user_api_key):
        """Should accept limit query parameter."""
        response = client.get(
            "/agents?limit=10",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200

    def test_list_agents_limit_max_100(self, client, user_api_key):
        """Limit should not exceed 100."""
        response = client.get(
            "/agents?limit=200",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 422  # Validation error


class TestGetAgent:
    """Tests for GET /agents/{agent_id}"""

    def test_get_agent_not_found(self, client, user_api_key):
        """Getting non-existent agent should return 404."""
        response = client.get(
            "/agents/nonexistent-id",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 404

    def test_get_agent_requires_auth(self, client):
        """Getting an agent requires authentication."""
        response = client.get("/agents/some-id")
        assert response.status_code == 401

    def test_get_agent_after_save(self, client, user_api_key, db):
        """Should return agent after saving to database."""
        # Manually insert an agent
        agent_data = {
            'id': 'test-agent-001',
            'name': 'Test Support Agent',
            'type': 'customer_support',
            'description': 'A test agent',
            'capabilities': ['conversation', 'knowledge_base'],
            'system_prompt': 'You are a helpful assistant.',
            'knowledge_base': {},
            'config': {'model': 'claude-sonnet-4-20250514'},
            'code': 'print("hello")',
            'embed_code': '<script>test</script>',
            'api_endpoint': '/api/agents/test-agent-001/chat',
            'created_at': datetime.now().isoformat()
        }
        db.save_agent(agent_data)

        response = client.get(
            "/agents/test-agent-001",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200


class TestDeleteAgent:
    """Tests for DELETE /agents/{agent_id}"""

    def test_delete_agent_requires_auth(self, client):
        """Deleting an agent requires authentication."""
        response = client.delete("/agents/some-id")
        assert response.status_code == 401

    def test_delete_agent_requires_write(self, client, readonly_api_key):
        """Deleting an agent requires write permission."""
        response = client.delete(
            "/agents/some-id",
            headers={"X-API-Key": readonly_api_key}
        )
        assert response.status_code == 403

    def test_delete_nonexistent_agent(self, client, user_api_key):
        """Deleting non-existent agent should return 404."""
        response = client.delete(
            "/agents/nonexistent-id",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 404

    def test_delete_existing_agent(self, client, user_api_key, db):
        """Deleting existing agent should succeed."""
        agent_data = {
            'id': 'delete-me-001',
            'name': 'Delete Test Agent',
            'type': 'faq_bot',
            'description': 'To be deleted',
            'capabilities': ['conversation'],
            'system_prompt': 'Hello',
            'knowledge_base': {},
            'config': {},
            'code': '',
            'embed_code': '',
            'api_endpoint': '',
            'created_at': datetime.now().isoformat()
        }
        db.save_agent(agent_data)

        response = client.delete(
            "/agents/delete-me-001",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify it's gone
        response = client.get(
            "/agents/delete-me-001",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 404


class TestBuildAgent:
    """Tests for POST /agents/build"""

    def test_build_requires_auth(self, client):
        """Building an agent requires authentication."""
        response = client.post(
            "/agents/build",
            json={"description": "A test agent"}
        )
        assert response.status_code == 401

    def test_build_requires_write(self, client, readonly_api_key):
        """Building an agent requires write permission."""
        response = client.post(
            "/agents/build",
            headers={"X-API-Key": readonly_api_key},
            json={"description": "A test agent for customer support"}
        )
        assert response.status_code == 403

    def test_build_requires_description(self, client, user_api_key):
        """Build request must include description."""
        response = client.post(
            "/agents/build",
            headers={"X-API-Key": user_api_key},
            json={}
        )
        assert response.status_code == 422

    def test_build_description_min_length(self, client, user_api_key):
        """Description must be at least 10 characters."""
        response = client.post(
            "/agents/build",
            headers={"X-API-Key": user_api_key},
            json={"description": "short"}
        )
        assert response.status_code == 422

    def test_build_requirements_max_20(self, client, user_api_key):
        """Requirements list should be limited to 20 items."""
        response = client.post(
            "/agents/build",
            headers={"X-API-Key": user_api_key},
            json={
                "description": "A test agent with too many requirements",
                "requirements": [f"req-{i}" for i in range(25)]
            }
        )
        assert response.status_code == 422
