"""
Tests for health check and public endpoints.
These endpoints don't require authentication.
"""

import pytest


class TestHealthCheck:
    """Tests for GET /health"""

    def test_health_returns_200(self, client):
        """Health check should always return 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self, client):
        """Health check should return proper structure."""
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert "service" in data
        assert "version" in data
        assert "timestamp" in data
        assert "checks" in data

        assert data["service"] == "agent-forge"
        assert data["version"] == "1.0.0"

    def test_health_checks_database(self, client):
        """Health check should verify database connectivity."""
        response = client.get("/health")
        data = response.json()

        assert "database" in data["checks"]
        # With fresh test database, should be healthy
        assert data["checks"]["database"] is True

    def test_health_checks_stripe(self, client):
        """Health check should verify Stripe configuration."""
        response = client.get("/health")
        data = response.json()

        assert "stripe" in data["checks"]


class TestPublicEndpoints:
    """Tests for endpoints that don't require authentication."""

    def test_billing_plans_no_auth(self, client):
        """GET /billing/plans should work without auth."""
        response = client.get("/billing/plans")
        assert response.status_code == 200

        data = response.json()
        assert "plans" in data
        assert "currency" in data

    def test_qa_status_no_auth(self, client):
        """GET /qa/status should work without auth."""
        response = client.get("/qa/status")
        assert response.status_code == 200

    def test_workflow_skills_no_auth(self, client):
        """GET /workflow/skills should work without auth."""
        response = client.get("/workflow/skills")
        assert response.status_code == 200

        data = response.json()
        assert "skills" in data
        assert "count" in data
