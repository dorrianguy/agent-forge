"""
Tests for security-related concerns.
Covers access control, error handling, and information leakage prevention.
"""

import pytest


class TestAccessControl:
    """Tests that endpoints enforce proper access control."""

    PROTECTED_GET_ENDPOINTS = [
        "/stats",
        "/agents",
        "/agents/test-id",
        "/tasks/test-id",
        "/tasks/queue/pending",
        "/config",
        "/config/ai",
        "/workforce/stats",
        "/workforce/workers",
        "/workforce/scaling-events",
        "/collaboration/stats",
        "/learning/stats",
        "/learning/outcomes",
        "/learning/strategies",
        "/billing/customers/test-id",
        "/billing/customers/test-id/subscriptions",
        "/billing/customers/test-id/invoices",
        "/billing/customers/test-id/payment-methods",
        "/billing/customers/test-id/usage",
    ]

    PROTECTED_POST_ENDPOINTS = [
        ("/tasks", {"type": "marketing", "priority": "MEDIUM", "payload": {}}),
        ("/agents/build", {"description": "A test agent for testing purposes"}),
        ("/sales/qualify", {"lead_data": {"name": "Test", "email": "t@t.com"}}),
        ("/sales/conversation", {"message": "Hello"}),
        ("/support", {"message": "I need help"}),
        ("/billing/customers", {"email": "test@example.com"}),
        ("/billing/checkout", {"customer_id": "c1", "plan": "starter", "success_url": "https://e.com/s", "cancel_url": "https://e.com/c"}),
        ("/billing/subscriptions/action", {"subscription_id": "sub_1", "action": "cancel"}),
        ("/workflow/start", {"name": "Test Workflow"}),
    ]

    @pytest.mark.parametrize("endpoint", PROTECTED_GET_ENDPOINTS)
    def test_get_endpoints_require_auth(self, client, endpoint):
        """All protected GET endpoints should require authentication."""
        response = client.get(endpoint)
        assert response.status_code in [401, 403], \
            f"GET {endpoint} returned {response.status_code} without auth"

    @pytest.mark.parametrize("endpoint,body", PROTECTED_POST_ENDPOINTS)
    def test_post_endpoints_require_auth(self, client, endpoint, body):
        """All protected POST endpoints should require authentication."""
        response = client.post(endpoint, json=body)
        assert response.status_code in [401, 403], \
            f"POST {endpoint} returned {response.status_code} without auth"

    def test_readonly_cannot_create_tasks(self, client, readonly_api_key):
        """Read-only key should not be able to create tasks."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": readonly_api_key},
            json={"type": "marketing", "priority": "MEDIUM", "payload": {}}
        )
        assert response.status_code == 403

    def test_readonly_cannot_delete_agents(self, client, readonly_api_key):
        """Read-only key should not be able to delete agents."""
        response = client.delete(
            "/agents/some-id",
            headers={"X-API-Key": readonly_api_key}
        )
        assert response.status_code == 403

    def test_user_cannot_manage_keys(self, client, user_api_key):
        """Non-admin key should not manage API keys."""
        # Create
        response = client.post(
            "/auth/keys",
            headers={"X-API-Key": user_api_key},
            json={"name": "sneaky-key"}
        )
        assert response.status_code == 403

        # List
        response = client.get(
            "/auth/keys",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 403

        # Delete
        response = client.delete(
            "/auth/keys/some-id",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 403


class TestErrorHandling:
    """Tests that errors are handled gracefully without leaking info."""

    def test_404_returns_json(self, client):
        """404 errors should return JSON, not HTML."""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code in [404, 405]
        data = response.json()
        assert "detail" in data or "error" in data or "message" in data

    def test_422_returns_details(self, client, user_api_key):
        """Validation errors should return helpful details."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={"type": "invalid_type"}
        )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    def test_error_response_structure(self, client):
        """Error responses should have consistent structure."""
        response = client.get("/stats")  # No auth
        assert response.status_code == 401
        data = response.json()
        assert "error" in data or "detail" in data


class TestInformationLeakage:
    """Tests that sensitive information is not leaked in responses."""

    def test_health_no_sensitive_data(self, client):
        """Health check should not expose sensitive configuration."""
        response = client.get("/health")
        data = response.json()
        text = str(data).lower()

        # Should not contain any sensitive info
        assert "api_key" not in text or "x-api-key" in text  # header name is ok
        assert "secret" not in text
        assert "password" not in text
        assert "token" not in text

    def test_stats_no_api_keys(self, client, admin_api_key):
        """Stats endpoint should not expose API keys."""
        response = client.get(
            "/stats",
            headers={"X-API-Key": admin_api_key}
        )
        data = response.json()
        text = str(data)

        # Should not contain actual key values
        assert admin_api_key not in text
