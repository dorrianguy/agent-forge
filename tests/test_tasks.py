"""
Tests for task management endpoints.
Covers task creation, retrieval, and queue management.
"""

import pytest


class TestCreateTask:
    """Tests for POST /tasks"""

    def test_create_task_requires_auth(self, client):
        """Creating a task requires authentication."""
        response = client.post("/tasks", json={
            "type": "marketing",
            "priority": "MEDIUM",
            "payload": {}
        })
        assert response.status_code == 401

    def test_create_task_requires_write(self, client, readonly_api_key):
        """Creating a task requires write permission."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": readonly_api_key},
            json={
                "type": "marketing",
                "priority": "MEDIUM",
                "payload": {}
            }
        )
        assert response.status_code == 403

    def test_create_valid_task(self, client, user_api_key):
        """Creating a valid task should succeed."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={
                "type": "marketing",
                "priority": "HIGH",
                "payload": {"topic": "AI agents"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "queued"

    def test_create_task_invalid_type(self, client, user_api_key):
        """Invalid task type should fail validation."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={
                "type": "invalid_type",
                "priority": "MEDIUM",
                "payload": {}
            }
        )
        assert response.status_code == 422

    def test_create_task_invalid_priority(self, client, user_api_key):
        """Invalid priority should fail validation."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={
                "type": "marketing",
                "priority": "ULTRA",
                "payload": {}
            }
        )
        assert response.status_code == 422

    def test_create_task_all_valid_types(self, client, user_api_key):
        """All valid task types should be accepted."""
        valid_types = ['marketing', 'sales', 'support', 'build', 'deploy', 'qa']
        for task_type in valid_types:
            response = client.post(
                "/tasks",
                headers={"X-API-Key": user_api_key},
                json={
                    "type": task_type,
                    "priority": "MEDIUM",
                    "payload": {}
                }
            )
            assert response.status_code == 200, f"Failed for type: {task_type}"

    def test_create_task_default_priority(self, client, user_api_key):
        """Default priority should be MEDIUM if not specified."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={
                "type": "marketing",
                "payload": {}
            }
        )
        assert response.status_code == 200

    def test_create_task_case_insensitive_priority(self, client, user_api_key):
        """Priority should be case-insensitive."""
        response = client.post(
            "/tasks",
            headers={"X-API-Key": user_api_key},
            json={
                "type": "marketing",
                "priority": "high",
                "payload": {}
            }
        )
        assert response.status_code == 200


class TestGetTask:
    """Tests for GET /tasks/{task_id}"""

    def test_get_task_requires_auth(self, client):
        """Getting a task requires authentication."""
        response = client.get("/tasks/some-task-id")
        assert response.status_code == 401

    def test_get_nonexistent_task(self, client, user_api_key):
        """Getting non-existent task should return 404."""
        response = client.get(
            "/tasks/nonexistent-id",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 404


class TestPendingTasks:
    """Tests for GET /tasks/queue/pending"""

    def test_pending_tasks_requires_auth(self, client):
        """Getting pending tasks requires authentication."""
        response = client.get("/tasks/queue/pending")
        assert response.status_code == 401

    def test_pending_tasks_empty_queue(self, client, user_api_key):
        """Empty queue should return count 0."""
        response = client.get(
            "/tasks/queue/pending",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["tasks"] == []

    def test_pending_tasks_limit_parameter(self, client, user_api_key):
        """Should accept limit query parameter."""
        response = client.get(
            "/tasks/queue/pending?limit=5",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 200

    def test_pending_tasks_limit_max_100(self, client, user_api_key):
        """Limit should not exceed 100."""
        response = client.get(
            "/tasks/queue/pending?limit=200",
            headers={"X-API-Key": user_api_key}
        )
        assert response.status_code == 422
