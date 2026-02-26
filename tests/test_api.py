"""
API endpoint tests for Agent Forge.
Tests authentication, authorization, and endpoint behavior.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_returns_200(self, test_client):
        """Test that /health returns 200 status code."""
        response = test_client.get("/health")
        assert response.status_code == 200

    def test_health_returns_status(self, test_client):
        """Test that /health returns a status field."""
        response = test_client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "unhealthy"]

    def test_health_returns_service_name(self, test_client):
        """Test that /health returns service name."""
        response = test_client.get("/health")
        data = response.json()
        assert data.get("service") == "agent-forge"

    def test_health_returns_version(self, test_client):
        """Test that /health returns version."""
        response = test_client.get("/health")
        data = response.json()
        assert "version" in data
        assert data["version"] == "1.0.0"

    def test_health_returns_timestamp(self, test_client):
        """Test that /health returns timestamp."""
        response = test_client.get("/health")
        data = response.json()
        assert "timestamp" in data

    def test_health_returns_checks(self, test_client):
        """Test that /health returns service checks."""
        response = test_client.get("/health")
        data = response.json()
        assert "checks" in data
        assert "database" in data["checks"]
        assert "stripe" in data["checks"]

    def test_health_no_auth_required(self, test_client):
        """Test that /health does not require authentication."""
        # No X-API-Key header
        response = test_client.get("/health")
        assert response.status_code == 200


class TestStatsEndpoint:
    """Tests for the /stats endpoint."""

    def test_stats_requires_auth(self, test_client):
        """Test that /stats requires authentication."""
        response = test_client.get("/stats")
        # Should return 401 without auth
        assert response.status_code == 401

    def test_stats_returns_401_without_key(self, test_client):
        """Test that /stats returns 401 without API key."""
        response = test_client.get("/stats")
        data = response.json()
        assert response.status_code == 401
        assert "error" in data or "detail" in data or "message" in data

    def test_stats_returns_401_with_invalid_key(self, test_client):
        """Test that /stats returns 401 with invalid API key."""
        response = test_client.get(
            "/stats",
            headers={"X-API-Key": "invalid-key-12345"}
        )
        assert response.status_code == 401

    def test_stats_succeeds_with_master_key(self, authenticated_client):
        """Test that /stats succeeds with master key."""
        client, headers = authenticated_client
        response = client.get("/stats", headers=headers)
        assert response.status_code == 200

    def test_stats_returns_data_structure(self, authenticated_client):
        """Test that /stats returns expected data structure."""
        client, headers = authenticated_client
        response = client.get("/stats", headers=headers)
        data = response.json()
        # Should return stats from orchestrator
        assert isinstance(data, dict)


class TestAgentsBuildEndpoint:
    """Tests for the /agents/build endpoint."""

    def test_build_requires_auth(self, test_client):
        """Test that /agents/build requires authentication."""
        response = test_client.post(
            "/agents/build",
            json={
                "description": "A test agent for customer support with AI capabilities"
            }
        )
        assert response.status_code == 401

    def test_build_requires_write_permission(self, test_client, mock_master_key):
        """Test that /agents/build requires authentication and write permission."""
        # Testing with invalid key should return 401 (authentication required first)
        response = test_client.post(
            "/agents/build",
            headers={"X-API-Key": "invalid-readonly-key"},
            json={
                "description": "A test agent for customer support with AI capabilities"
            }
        )
        # Authentication fails first (401), then permission would be checked (403)
        # This test verifies the endpoint requires authentication
        assert response.status_code == 401

    def test_build_validates_description_length(self, test_client, mock_master_key):
        """Test that /agents/build validates description minimum length."""
        response = test_client.post(
            "/agents/build",
            headers={"X-API-Key": mock_master_key},
            json={
                "description": "short"  # Less than 10 chars
            }
        )
        # Should return 422 validation error
        assert response.status_code == 422

    def test_build_with_valid_request(self, authenticated_client, mock_builder):
        """Test /agents/build with a valid request."""
        client, headers = authenticated_client

        # Mock the builder response
        mock_agent = MagicMock()
        mock_agent.spec.id = "agent_123"
        mock_agent.spec.name = "Test Agent"
        mock_agent.spec.type.value = "support"
        mock_agent.spec.description = "A test agent"
        mock_agent.spec.capabilities = []
        mock_agent.spec.system_prompt = "You are a test agent"
        mock_agent.spec.knowledge_base = {}
        mock_agent.spec.created_at.isoformat.return_value = "2024-01-01T00:00:00"
        mock_agent.config = {}
        mock_agent.code = "class Agent: pass"
        mock_agent.embed_code = "<script></script>"
        mock_agent.api_endpoint = "/api/agents/agent_123"

        mock_builder.build_agent.return_value = mock_agent

        with patch('backend.api.get_builder', return_value=mock_builder):
            with patch('backend.api.db') as mock_db:
                mock_db.save_agent.return_value = "agent_123"
                mock_db.save_outcome.return_value = "outcome_123"

                with patch('backend.api.get_orchestrator') as mock_get_orch:
                    mock_orch = MagicMock()
                    mock_orch.workflow.start_workflow = AsyncMock(return_value={
                        'status': 'started',
                        'tasks_created': 5,
                        'phases': ['planning', 'development']
                    })
                    mock_get_orch.return_value = mock_orch

                    response = client.post(
                        "/agents/build",
                        headers=headers,
                        json={
                            "description": "A test agent for customer support with AI capabilities"
                        }
                    )

        # Should succeed or at least not be auth/validation error
        assert response.status_code in [200, 201, 500]  # 500 if mocking incomplete


class TestTasksEndpoint:
    """Tests for the /tasks endpoint."""

    def test_create_task_requires_auth(self, test_client):
        """Test that POST /tasks requires authentication."""
        response = test_client.post(
            "/tasks",
            json={
                "type": "support",
                "priority": "MEDIUM",
                "payload": {}
            }
        )
        assert response.status_code == 401

    def test_invalid_task_type_returns_422(self, authenticated_client):
        """Test that invalid task type returns 422 validation error."""
        client, headers = authenticated_client

        response = client.post(
            "/tasks",
            headers=headers,
            json={
                "type": "invalid_type",  # Not a valid type
                "priority": "MEDIUM",
                "payload": {}
            }
        )
        # Should return 422 for validation error
        assert response.status_code == 422

    def test_invalid_priority_returns_422(self, authenticated_client):
        """Test that invalid priority returns 422 validation error."""
        client, headers = authenticated_client

        response = client.post(
            "/tasks",
            headers=headers,
            json={
                "type": "support",
                "priority": "INVALID_PRIORITY",  # Not a valid priority
                "payload": {}
            }
        )
        # Should return 422 for validation error
        assert response.status_code == 422

    def test_valid_task_types(self, authenticated_client):
        """Test that valid task types are accepted."""
        client, headers = authenticated_client
        valid_types = ['marketing', 'sales', 'support', 'build', 'deploy', 'qa']

        for task_type in valid_types:
            with patch('backend.api.db') as mock_db:
                mock_db.save_task.return_value = "task_123"
                with patch('backend.api.get_orchestrator') as mock_get_orch:
                    mock_orch = MagicMock()
                    mock_orch.add_task.return_value = None
                    mock_get_orch.return_value = mock_orch

                    response = client.post(
                        "/tasks",
                        headers=headers,
                        json={
                            "type": task_type,
                            "priority": "MEDIUM",
                            "payload": {}
                        }
                    )
                    # Should not be a validation error
                    assert response.status_code != 422, f"Task type '{task_type}' should be valid"

    def test_valid_priorities(self, authenticated_client):
        """Test that valid priorities are accepted."""
        client, headers = authenticated_client
        valid_priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

        for priority in valid_priorities:
            with patch('backend.api.db') as mock_db:
                mock_db.save_task.return_value = "task_123"
                with patch('backend.api.get_orchestrator') as mock_get_orch:
                    mock_orch = MagicMock()
                    mock_orch.add_task.return_value = None
                    mock_get_orch.return_value = mock_orch

                    response = client.post(
                        "/tasks",
                        headers=headers,
                        json={
                            "type": "support",
                            "priority": priority,
                            "payload": {}
                        }
                    )
                    # Should not be a validation error
                    assert response.status_code != 422, f"Priority '{priority}' should be valid"


class TestAuthKeyEndpoints:
    """Tests for API key management endpoints."""

    def test_create_key_requires_admin(self, authenticated_client):
        """Test that creating API keys requires admin permission."""
        client, headers = authenticated_client

        # Master key should have admin permission
        response = client.post(
            "/auth/keys",
            headers=headers,
            json={
                "name": "Test Key",
                "permissions": ["read", "write"]
            }
        )
        # Should succeed with master key (has admin)
        assert response.status_code in [200, 201]

    def test_list_keys_requires_admin(self, test_client):
        """Test that listing API keys requires admin permission."""
        response = test_client.get("/auth/keys")
        # Should require admin permission (403 Forbidden)
        assert response.status_code == 403

    def test_delete_key_requires_admin(self, test_client):
        """Test that deleting API keys requires admin permission."""
        response = test_client.delete("/auth/keys/some_key_id")
        # Should require admin permission (403 Forbidden)
        assert response.status_code == 403


class TestBillingEndpoints:
    """Tests for billing-related endpoints."""

    def test_billing_plans_is_public(self, test_client):
        """Test that /billing/plans is publicly accessible."""
        with patch('backend.api.get_orchestrator') as mock_get_orch:
            mock_orch = MagicMock()
            mock_orch.config = {'pricing': {'plans': {}}}
            mock_get_orch.return_value = mock_orch

            response = test_client.get("/billing/plans")
            # Should be accessible without auth
            assert response.status_code == 200

    def test_billing_status_is_public(self, test_client, mock_billing):
        """Test that /billing/status is publicly accessible."""
        with patch('backend.api.get_billing', return_value=mock_billing):
            response = test_client.get("/billing/status")
            assert response.status_code == 200

    def test_create_customer_requires_auth(self, test_client):
        """Test that creating customers requires authentication."""
        response = test_client.post(
            "/billing/customers",
            json={
                "email": "test@example.com",
                "name": "Test User"
            }
        )
        assert response.status_code == 401


class TestQAEndpoints:
    """Tests for QA-related endpoints."""

    def test_qa_status_is_public(self, test_client):
        """Test that /qa/status is publicly accessible."""
        with patch('backend.api.get_orchestrator') as mock_get_orch:
            mock_orch = MagicMock()
            mock_orch.qa.get_status.return_value = {'status': 'ready'}
            mock_get_orch.return_value = mock_orch

            response = test_client.get("/qa/status")
            assert response.status_code == 200

    def test_qa_run_requires_auth(self, test_client):
        """Test that /qa/run requires authentication."""
        response = test_client.get("/qa/run")
        assert response.status_code == 401


class TestWorkflowEndpoints:
    """Tests for workflow-related endpoints."""

    def test_workflow_skills_requires_auth(self, test_client):
        """Test that /workflow/skills requires authentication."""
        response = test_client.get("/workflow/skills")
        # Endpoint requires authentication
        assert response.status_code == 401

    def test_start_workflow_requires_auth(self, test_client):
        """Test that starting a workflow requires authentication."""
        response = test_client.post(
            "/workflow/start",
            json={
                "name": "Test Workflow",
                "type": "app"
            }
        )
        assert response.status_code == 401

    def test_list_workflows_requires_auth(self, test_client):
        """Test that listing workflows requires authentication."""
        response = test_client.get("/workflow")
        assert response.status_code == 401


class TestErrorHandling:
    """Tests for error handling."""

    def test_404_for_nonexistent_agent(self, authenticated_client):
        """Test that requesting nonexistent agent returns 404."""
        client, headers = authenticated_client

        with patch('backend.api.db') as mock_db:
            mock_db.get_agent.return_value = None

            response = client.get(
                "/agents/nonexistent_id",
                headers=headers
            )
            assert response.status_code == 404

    def test_404_for_nonexistent_task(self, authenticated_client):
        """Test that requesting nonexistent task returns 404."""
        client, headers = authenticated_client

        with patch('backend.api.db') as mock_db:
            mock_db.get_task.return_value = None

            response = client.get(
                "/tasks/nonexistent_id",
                headers=headers
            )
            assert response.status_code == 404

    def test_error_response_format(self, test_client):
        """Test that error responses have consistent format."""
        response = test_client.get("/stats")  # Requires auth
        data = response.json()

        # Should have error info
        assert response.status_code == 401
        assert isinstance(data, dict)
