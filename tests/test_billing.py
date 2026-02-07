"""
Tests for billing endpoints.
Covers customer management, checkout, subscriptions, and webhooks.
"""

import pytest
import json
from datetime import datetime


class TestBillingPlans:
    """Tests for GET /billing/plans (public)"""

    def test_plans_no_auth_required(self, client):
        """Billing plans should be public."""
        response = client.get("/billing/plans")
        assert response.status_code == 200

    def test_plans_response_structure(self, client):
        """Plans response should have currency and plans."""
        response = client.get("/billing/plans")
        data = response.json()

        assert "currency" in data
        assert "plans" in data
        assert data["currency"] == "USD"

    def test_plans_contains_tiers(self, client):
        """Plans should include all pricing tiers."""
        response = client.get("/billing/plans")
        plans = response.json()["plans"]

        assert "starter" in plans
        assert "professional" in plans
        assert "enterprise" in plans


class TestBillingStatus:
    """Tests for GET /billing/status"""

    def test_billing_status_response(self, client):
        """Billing status should indicate if Stripe is configured."""
        response = client.get("/billing/status")
        assert response.status_code == 200
        data = response.json()

        assert "configured" in data
        assert "plans_available" in data


class TestCreateCustomer:
    """Tests for POST /billing/customers"""

    def test_create_customer_requires_auth(self, client):
        """Creating a customer requires authentication."""
        response = client.post("/billing/customers", json={
            "email": "test@example.com",
            "name": "Test User"
        })
        assert response.status_code == 401

    def test_create_customer_valid(self, client, user_api_key):
        """Should create a customer with valid data."""
        response = client.post(
            "/billing/customers",
            headers={"X-API-Key": user_api_key},
            json={
                "email": "test@example.com",
                "name": "Test User"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "customer_id" in data
        assert "stripe_customer_id" in data

    def test_create_customer_invalid_email(self, client, user_api_key):
        """Invalid email should fail validation."""
        response = client.post(
            "/billing/customers",
            headers={"X-API-Key": user_api_key},
            json={
                "email": "not-an-email",
                "name": "Test User"
            }
        )
        assert response.status_code == 422

    def test_create_customer_missing_email(self, client, user_api_key):
        """Missing email should fail validation."""
        response = client.post(
            "/billing/customers",
            headers={"X-API-Key": user_api_key},
            json={
                "name": "Test User"
            }
        )
        assert response.status_code == 422


class TestGetCustomer:
    """Tests for GET /billing/customers/{customer_id}"""

    def test_get_customer_requires_auth(self, client):
        """Getting a customer requires authentication."""
        response = client.get("/billing/customers/some-id")
        assert response.status_code == 401

    def test_get_customer_not_found(self, client, user_api_key):
        """Getting non-existent customer should return 404."""
        response = client.get(
            "/billing/customers/nonexistent",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 404


class TestCheckout:
    """Tests for POST /billing/checkout"""

    def test_checkout_requires_auth(self, client):
        """Creating checkout session requires authentication."""
        response = client.post("/billing/checkout", json={
            "customer_id": "cust-1",
            "plan": "starter",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel"
        })
        assert response.status_code == 401

    def test_checkout_invalid_plan(self, client, user_api_key):
        """Invalid plan should fail validation."""
        response = client.post(
            "/billing/checkout",
            headers={"X-API-Key": user_api_key},
            json={
                "customer_id": "cust-1",
                "plan": "ultra_plan",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
        )
        assert response.status_code == 422

    def test_checkout_missing_urls(self, client, user_api_key):
        """Missing required URLs should fail validation."""
        response = client.post(
            "/billing/checkout",
            headers={"X-API-Key": user_api_key},
            json={
                "customer_id": "cust-1",
                "plan": "starter"
            }
        )
        assert response.status_code == 422

    def test_checkout_customer_not_found(self, client, user_api_key):
        """Checkout with non-existent customer should return 404."""
        response = client.post(
            "/billing/checkout",
            headers={"X-API-Key": user_api_key},
            json={
                "customer_id": "nonexistent",
                "plan": "starter",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
        )
        assert response.status_code == 404


class TestSubscriptionAction:
    """Tests for POST /billing/subscriptions/action"""

    def test_subscription_action_requires_auth(self, client):
        """Subscription actions require authentication."""
        response = client.post("/billing/subscriptions/action", json={
            "subscription_id": "sub_test",
            "action": "cancel"
        })
        assert response.status_code == 401

    def test_invalid_action(self, client, user_api_key):
        """Invalid action should return 400."""
        response = client.post(
            "/billing/subscriptions/action",
            headers={"X-API-Key": user_api_key},
            json={
                "subscription_id": "sub_test",
                "action": "destroy"
            }
        )
        assert response.status_code == 400

    def test_update_requires_new_plan(self, client, user_api_key):
        """Update action should require new_plan."""
        response = client.post(
            "/billing/subscriptions/action",
            headers={"X-API-Key": user_api_key},
            json={
                "subscription_id": "sub_test",
                "action": "update"
            }
        )
        assert response.status_code == 400


class TestWebhook:
    """Tests for POST /billing/webhook"""

    def test_webhook_missing_signature(self, client):
        """Webhook without signature should return 400."""
        response = client.post(
            "/billing/webhook",
            content=b'{}',
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400

    def test_webhook_invalid_signature(self, client, mock_billing):
        """Webhook with invalid signature should return 400."""
        mock_billing.verify_webhook.return_value = None

        response = client.post(
            "/billing/webhook",
            content=b'{"type": "test"}',
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "invalid_sig"
            }
        )
        assert response.status_code == 400
