/**
 * Tests for lib/apiHelpers.ts
 *
 * Tests the utility functions that don't require mocked Next.js internals.
 * Server-side functions (requireAuth, createServerSupabaseClient) need
 * integration tests with proper Next.js test env.
 *
 * 🌙 Night Shift Agent — 2026-02-15
 */

import {
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  successResponse,
  createdResponse,
  noContentResponse,
  validationErrorResponse,
} from '@/lib/apiHelpers';
import { NextResponse } from 'next/server';

// ============================================================
// ERROR RESPONSES
// ============================================================

describe('Error Response Helpers', () => {
  describe('errorResponse', () => {
    it('returns correct status and error message', async () => {
      const response = errorResponse({ status: 400, error: 'Bad request' });
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Bad request');
    });

    it('includes details when provided', async () => {
      const response = errorResponse({
        status: 422,
        error: 'Validation failed',
        details: [{ field: 'name', message: 'required' }],
      });
      const body = await response.json();
      expect(body.details).toHaveLength(1);
      expect(body.details[0].field).toBe('name');
    });

    it('does not include details key when not provided', async () => {
      const response = errorResponse({ status: 500, error: 'Server error' });
      const body = await response.json();
      expect(body.details).toBeUndefined();
    });
  });

  describe('notFoundResponse', () => {
    it('returns 404 with default message', async () => {
      const response = notFoundResponse();
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Resource not found');
    });

    it('returns 404 with custom resource name', async () => {
      const response = notFoundResponse('Agent');
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('forbiddenResponse', () => {
    it('returns 403 with default message', async () => {
      const response = forbiddenResponse();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Access denied');
    });

    it('returns 403 with custom message', async () => {
      const response = forbiddenResponse('Not your agent');
      const body = await response.json();
      expect(body.error).toBe('Not your agent');
    });
  });

  describe('serverErrorResponse', () => {
    it('returns 500 with default message', async () => {
      const response = serverErrorResponse();
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('validationErrorResponse', () => {
    it('returns 400 with formatted errors', async () => {
      const errors = [
        { field: 'name', message: 'Name is required', code: 'required' },
        { field: 'type', message: 'Invalid type', code: 'invalid_enum' },
      ];
      const response = validationErrorResponse(errors);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Name is required');
      expect(body.details).toHaveLength(2);
    });
  });
});

// ============================================================
// SUCCESS RESPONSES
// ============================================================

describe('Success Response Helpers', () => {
  describe('successResponse', () => {
    it('returns 200 by default', async () => {
      const response = successResponse({ ok: true });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });

    it('accepts custom status code', async () => {
      const response = successResponse({ items: [] }, 206);
      expect(response.status).toBe(206);
    });
  });

  describe('createdResponse', () => {
    it('returns 201 with data', async () => {
      const response = createdResponse({ id: 'abc', name: 'New Agent' });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe('abc');
      expect(body.name).toBe('New Agent');
    });
  });

  describe('noContentResponse', () => {
    it('returns 204 with no body', () => {
      const response = noContentResponse();
      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });
});
