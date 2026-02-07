"""
Tests for authentication and API key management.
Covers key creation, validation, rate limiting, and access control.
"""

import pytest
import time
from backend.auth import (
    generate_api_key,
    hash_api_key,
    create_api_key,
    validate_api_key,
    check_rate_limit,
    get_remaining_requests,
    _rate_limits,
)


class TestApiKeyGeneration:
    """Tests for API key generation."""

    def test_generate_key_format(self):
        """Generated key should follow afk_<hex>.<urlsafe> format."""
        full_key, key_id = generate_api_key()

        assert key_id.startswith("afk_")
        assert "." in full_key
        assert full_key.startswith(key_id)

    def test_generate_key_uniqueness(self):
        """Each generated key should be unique."""
        keys = set()
        for _ in range(100):
            full_key, _ = generate_api_key()
            keys.add(full_key)

        assert len(keys) == 100

    def test_hash_api_key_deterministic(self):
        """Same key should always produce the same hash."""
        key = "afk_test1234.secretpart"
        hash1 = hash_api_key(key)
        hash2 = hash_api_key(key)

        assert hash1 == hash2

    def test_hash_api_key_different_inputs(self):
        """Different keys should produce different hashes."""
        hash1 = hash_api_key("afk_test1234.secret1")
        hash2 = hash_api_key("afk_test1234.secret2")

        assert hash1 != hash2


class TestApiKeyCreation:
    """Tests for creating and storing API keys."""

    def test_create_api_key_returns_full_key(self, db):
        """create_api_key should return the full key (shown only once)."""
        result = create_api_key("test-key", ["read", "write"])

        assert "api_key" in result
        assert "key_id" in result
        assert "name" in result
        assert result["name"] == "test-key"
        assert result["api_key"].startswith("afk_")

    def test_created_key_validates(self, db):
        """A created key should be valid when checked."""
        result = create_api_key("validate-test", ["read", "write"])
        full_key = result["api_key"]

        validation = validate_api_key(full_key)
        assert validation is not None

    def test_invalid_key_returns_none(self, db):
        """An invalid key should return None."""
        result = validate_api_key("afk_fake.notavalidkey")
        assert result is None

    def test_empty_key_returns_none(self, db):
        """An empty key should return None."""
        result = validate_api_key("")
        assert result is None

    def test_none_key_returns_none(self, db):
        """None key should return None."""
        result = validate_api_key(None)
        assert result is None


class TestRateLimiting:
    """Tests for rate limiting."""

    def setup_method(self):
        """Clear rate limit state before each test."""
        _rate_limits.clear()

    def test_first_request_allowed(self):
        """First request should always be allowed."""
        assert check_rate_limit("test-key-1", limit=10) is True

    def test_within_limit_allowed(self):
        """Requests within the limit should be allowed."""
        for i in range(9):
            assert check_rate_limit("test-key-2", limit=10) is True

    def test_over_limit_blocked(self):
        """Requests over the limit should be blocked."""
        key = "test-key-3"
        for _ in range(10):
            check_rate_limit(key, limit=10)

        assert check_rate_limit(key, limit=10) is False

    def test_remaining_requests_count(self):
        """get_remaining_requests should return correct count."""
        key = "test-key-4"
        for _ in range(3):
            check_rate_limit(key, limit=10)

        remaining = get_remaining_requests(key, limit=10)
        assert remaining == 7

    def test_different_keys_independent(self):
        """Rate limits for different keys should be independent."""
        for _ in range(10):
            check_rate_limit("key-a", limit=10)

        # key-b should still have full quota
        assert check_rate_limit("key-b", limit=10) is True
        assert get_remaining_requests("key-b", limit=10) == 9


class TestAuthEndpoints:
    """Tests for authentication API endpoints."""

    def test_no_api_key_returns_401(self, client):
        """Requests without API key should get 401."""
        response = client.get("/stats")
        assert response.status_code == 401

    def test_invalid_api_key_returns_401(self, client):
        """Requests with invalid API key should get 401."""
        response = client.get("/stats", headers={"X-API-Key": "afk_fake.notreal"})
        assert response.status_code == 401

    def test_valid_api_key_returns_200(self, client, admin_api_key):
        """Requests with valid API key should succeed."""
        response = client.get("/stats", headers={"X-API-Key": admin_api_key})
        assert response.status_code == 200

    def test_create_key_requires_admin(self, client, user_api_key):
        """Creating API keys should require admin permissions."""
        response = client.post(
            "/auth/keys",
            headers={"X-API-Key": user_api_key},
            json={"name": "new-key", "permissions": ["read"]}
        )
        assert response.status_code == 403

    def test_create_key_with_admin(self, client, admin_api_key):
        """Admin should be able to create API keys."""
        response = client.post(
            "/auth/keys",
            headers={"X-API-Key": admin_api_key},
            json={"name": "new-key", "permissions": ["read", "write"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "api_key" in data
        assert "key_id" in data

    def test_list_keys_requires_admin(self, client, user_api_key):
        """Listing API keys should require admin permissions."""
        response = client.get(
            "/auth/keys",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 403

    def test_list_keys_with_admin(self, client, admin_api_key):
        """Admin should be able to list API keys."""
        response = client.get(
            "/auth/keys",
            headers={"X-API-Key": admin_api_key}
        )
        assert response.status_code == 200

    def test_delete_key_requires_admin(self, client, user_api_key):
        """Deleting API keys should require admin permissions."""
        response = client.delete(
            "/auth/keys/some-key-id",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 403
