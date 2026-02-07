"""
Tests for request validation and input sanitization.
Ensures the API properly validates all inputs and rejects malformed data.
"""

import pytest


class TestTaskValidation:
    """Tests for task request validation."""

    def test_empty_body_rejected(self, client, user_api_key):
        """Empty request body should be rejected."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={}
        )
        assert response.status_code == 422

    def test_missing_type_rejected(self, client, user_api_key):
        """Missing task type should be rejected."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={"priority": "HIGH", "payload": {}}
        )
        assert response.status_code == 422


class TestSalesValidation:
    """Tests for sales endpoint validation."""

    def test_conversation_empty_message(self, client, user_api_key):
        """Empty message should be rejected."""
        response = client.post(
            "/sales/conversation",
            headers={"X-API-Key": user_api_key},
            json={"message": ""}
        )
        assert response.status_code == 422

    def test_conversation_oversized_history(self, client, user_api_key):
        """History with >50 messages should be rejected."""
        huge_history = [{"role": "user", "content": f"msg-{i}"} for i in range(55)]
        response = client.post(
            "/sales/conversation",
            headers={"X-API-Key": user_api_key},
            json={
                "message": "Hello there",
                "history": huge_history
            }
        )
        assert response.status_code == 422

    def test_qualify_lead_empty_data(self, client, user_api_key):
        """Empty lead data should be rejected."""
        response = client.post(
            "/sales/qualify",
            headers={"X-API-Key": user_api_key},
            json={"lead_data": {}}
        )
        assert response.status_code == 422


class TestBuildValidation:
    """Tests for agent build request validation."""

    def test_description_too_long(self, client, user_api_key):
        """Description over 5000 chars should be rejected."""
        response = client.post(
            "/agents/build",
            headers={"X-API-Key": user_api_key},
            json={"description": "x" * 5001}
        )
        assert response.status_code == 422

    def test_description_too_short(self, client, user_api_key):
        """Description under 10 chars should be rejected."""
        response = client.post(
            "/agents/build",
            headers={"X-API-Key": user_api_key},
            json={"description": "short"}
        )
        assert response.status_code == 422


class TestSupportValidation:
    """Tests for support endpoint validation."""

    def test_support_empty_message(self, client, user_api_key):
        """Empty support message should be rejected."""
        response = client.post(
            "/support",
            headers={"X-API-Key": user_api_key},
            json={"message": ""}
        )
        assert response.status_code == 422

    def test_support_oversized_message(self, client, user_api_key):
        """Messages over 10000 chars should be rejected."""
        response = client.post(
            "/support",
            headers={"X-API-Key": user_api_key},
            json={"message": "x" * 10001}
        )
        assert response.status_code == 422


class TestBillingValidation:
    """Tests for billing request validation."""

    def test_create_customer_short_email(self, client, user_api_key):
        """Emails that are clearly invalid should fail."""
        response = client.post(
            "/billing/customers",
            headers={"X-API-Key": user_api_key},
            json={"email": "abc"}
        )
        assert response.status_code == 422

    def test_checkout_missing_customer_id(self, client, user_api_key):
        """Missing customer_id should fail."""
        response = client.post(
            "/billing/checkout",
            headers={"X-API-Key": user_api_key},
            json={
                "plan": "starter",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
        )
        assert response.status_code == 422

    def test_subscription_action_missing_id(self, client, user_api_key):
        """Missing subscription_id should fail."""
        response = client.post(
            "/billing/subscriptions/action",
            headers={"X-API-Key": user_api_key},
            json={"action": "cancel"}
        )
        assert response.status_code == 422


class TestWorkflowValidation:
    """Tests for workflow request validation."""

    def test_start_workflow_missing_name(self, client, user_api_key):
        """Missing workflow name should fail."""
        response = client.post(
            "/workflow/start",
            headers={"X-API-Key": user_api_key},
            json={}
        )
        assert response.status_code == 422

    def test_start_workflow_empty_name(self, client, user_api_key):
        """Empty workflow name should fail."""
        response = client.post(
            "/workflow/start",
            headers={"X-API-Key": user_api_key},
            json={"name": ""}
        )
        assert response.status_code == 422

    def test_start_workflow_name_too_long(self, client, user_api_key):
        """Workflow name over 255 chars should fail."""
        response = client.post(
            "/workflow/start",
            headers={"X-API-Key": user_api_key},
            json={"name": "x" * 256}
        )
        assert response.status_code == 422


class TestWorkforceValidation:
    """Tests for workforce endpoint validation."""

    def test_spawn_worker_invalid_type(self, client, admin_api_key):
        """Invalid worker type should return 400."""
        response = client.post(
            "/workforce/spawn?worker_type=mega_robot",
            headers={"X-API-Key": admin_api_key}
        )
        assert response.status_code == 400

    def test_spawn_worker_requires_admin(self, client, user_api_key):
        """Spawning workers should require admin."""
        response = client.post(
            "/workforce/spawn?worker_type=builder",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 403

    def test_terminate_worker_requires_admin(self, client, user_api_key):
        """Terminating workers should require admin."""
        response = client.delete(
            "/workforce/workers/some-worker-id",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 403
