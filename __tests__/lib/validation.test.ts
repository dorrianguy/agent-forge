/**
 * Tests for lib/validation.ts
 * Comprehensive coverage for all validation functions.
 *
 * 🌙 Night Shift Agent — 2026-02-15
 */

import {
  isValidUUID,
  isValidEmail,
  isValidSlug,
  sanitizeString,
  sanitizeObject,
  validateCreateAgent,
  validateUpdateAgent,
  validateTTSInput,
  validatePagination,
  validateIdParam,
  formatValidationErrors,
  isValidPlan,
  VALID_AGENT_TYPES,
  VALID_AGENT_STATUSES,
  PLAN_AGENT_LIMITS,
} from '@/lib/validation';

// ============================================================
// UUID VALIDATION
// ============================================================

describe('isValidUUID', () => {
  it('accepts valid v4 UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('accepts case-insensitive UUIDs', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    expect(isValidUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false); // Too short
    expect(isValidUUID('550e8400-e29b-41d4-a716-4466554400001')).toBe(false); // Too long
    expect(isValidUUID('550e8400-e29b-61d4-a716-446655440000')).toBe(false); // Invalid version
    expect(isValidUUID('gggggggg-gggg-4ggg-aggg-gggggggggggg')).toBe(false); // Invalid hex
  });
});

// ============================================================
// EMAIL VALIDATION
// ============================================================

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user.name@sub.example.com')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false); // Space
  });

  it('rejects emails exceeding max length', () => {
    const longLocal = 'a'.repeat(300);
    expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
  });
});

// ============================================================
// SLUG VALIDATION
// ============================================================

describe('isValidSlug', () => {
  it('accepts valid slugs', () => {
    expect(isValidSlug('hello')).toBe(true);
    expect(isValidSlug('hello-world')).toBe(true);
    expect(isValidSlug('my-project-123')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Hello')).toBe(false); // Uppercase
    expect(isValidSlug('hello_world')).toBe(false); // Underscore
    expect(isValidSlug('-hello')).toBe(false); // Leading hyphen
    expect(isValidSlug('hello-')).toBe(false); // Trailing hyphen
    expect(isValidSlug('hello--world')).toBe(false); // Double hyphen
    expect(isValidSlug('hello world')).toBe(false); // Space
  });

  it('rejects slugs exceeding max length', () => {
    const longSlug = 'a'.repeat(129);
    expect(isValidSlug(longSlug)).toBe(false);
  });
});

// ============================================================
// SANITIZATION
// ============================================================

describe('sanitizeString', () => {
  it('strips HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeString('<b>bold</b>')).toBe('bold');
    expect(sanitizeString('Hello <img src=x onerror=alert(1)> World')).toBe('Hello  World');
  });

  it('removes angle brackets', () => {
    expect(sanitizeString('a < b > c')).toBe('a  b  c');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('passes through clean strings unchanged', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
    expect(sanitizeString('user@example.com')).toBe('user@example.com');
  });
});

describe('sanitizeObject', () => {
  it('sanitizes string values in an object', () => {
    const input = { name: '<b>Test</b>', count: 5, active: true };
    const result = sanitizeObject(input);
    expect(result.name).toBe('Test');
    expect(result.count).toBe(5);
    expect(result.active).toBe(true);
  });

  it('recursively sanitizes nested objects', () => {
    const input = { config: { label: '<script>bad</script>' } };
    const result = sanitizeObject(input as any);
    expect((result.config as any).label).toBe('bad');
  });
});

// ============================================================
// CREATE AGENT VALIDATION
// ============================================================

describe('validateCreateAgent', () => {
  const validAgent = {
    name: 'My Support Bot',
    type: 'customer_support',
    description: 'Handles customer inquiries',
  };

  it('accepts a valid agent', () => {
    const result = validateCreateAgent(validAgent);
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('My Support Bot');
    expect(result.data?.type).toBe('customer_support');
    expect(result.data?.description).toBe('Handles customer inquiries');
  });

  it('accepts minimal agent (name + type only)', () => {
    const result = validateCreateAgent({ name: 'Bot', type: 'faq' });
    expect(result.success).toBe(true);
    expect(result.data?.description).toBeUndefined();
    expect(result.data?.config).toBeUndefined();
  });

  it('accepts all valid agent types', () => {
    for (const type of VALID_AGENT_TYPES) {
      const result = validateCreateAgent({ name: 'Bot', type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects non-object body', () => {
    expect(validateCreateAgent('string').success).toBe(false);
    expect(validateCreateAgent(null).success).toBe(false);
    expect(validateCreateAgent(42).success).toBe(false);
    expect(validateCreateAgent([]).success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = validateCreateAgent({ type: 'faq' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects empty name', () => {
    const result = validateCreateAgent({ name: '   ', type: 'faq' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'name')).toBe(true);
  });

  it('rejects name exceeding 100 chars', () => {
    const result = validateCreateAgent({ name: 'x'.repeat(101), type: 'faq' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'name' && e.code === 'too_long')).toBe(true);
  });

  it('rejects missing type', () => {
    const result = validateCreateAgent({ name: 'Bot' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'type')).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = validateCreateAgent({ name: 'Bot', type: 'invalid_type' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'type' && e.code === 'invalid_enum')).toBe(true);
  });

  it('rejects description exceeding 500 chars', () => {
    const result = validateCreateAgent({
      name: 'Bot',
      type: 'faq',
      description: 'd'.repeat(501),
    });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'description')).toBe(true);
  });

  it('rejects non-object config', () => {
    const result = validateCreateAgent({ name: 'Bot', type: 'faq', config: 'not-object' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'config')).toBe(true);
  });

  it('accepts object config', () => {
    const result = validateCreateAgent({
      name: 'Bot',
      type: 'faq',
      config: { temperature: 0.7, model: 'gpt-4' },
    });
    expect(result.success).toBe(true);
    expect(result.data?.config).toEqual({ temperature: 0.7, model: 'gpt-4' });
  });

  it('sanitizes HTML in name', () => {
    const result = validateCreateAgent({ name: '<b>Bot</b>', type: 'faq' });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Bot');
  });

  it('returns multiple errors at once', () => {
    const result = validateCreateAgent({ description: 'd'.repeat(501) });
    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThanOrEqual(2); // name + type missing
  });
});

// ============================================================
// UPDATE AGENT VALIDATION
// ============================================================

describe('validateUpdateAgent', () => {
  it('accepts valid name update', () => {
    const result = validateUpdateAgent({ name: 'New Name' });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('New Name');
  });

  it('accepts valid status update', () => {
    for (const status of VALID_AGENT_STATUSES) {
      const result = validateUpdateAgent({ status });
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(status);
    }
  });

  it('accepts multiple fields at once', () => {
    const result = validateUpdateAgent({ name: 'Updated', status: 'live', type: 'voice' });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Updated');
    expect(result.data?.status).toBe('live');
    expect(result.data?.type).toBe('voice');
  });

  it('rejects empty update body', () => {
    const result = validateUpdateAgent({});
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.code === 'empty_update')).toBe(true);
  });

  it('rejects non-object body', () => {
    const result = validateUpdateAgent('not-object');
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = validateUpdateAgent({ status: 'destroyed' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'status')).toBe(true);
  });

  it('rejects empty name string', () => {
    const result = validateUpdateAgent({ name: '   ' });
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'name')).toBe(true);
  });
});

// ============================================================
// TTS VALIDATION
// ============================================================

describe('validateTTSInput', () => {
  it('accepts valid input for authenticated user', () => {
    const result = validateTTSInput({ text: 'Hello world' }, true);
    expect(result.success).toBe(true);
    expect(result.data?.text).toBe('Hello world');
  });

  it('accepts voice and speed', () => {
    const result = validateTTSInput({ text: 'Hello', voice: 'Nova', speed: 1.5 }, true);
    expect(result.success).toBe(true);
    expect(result.data?.voice).toBe('nova'); // lowercased
    expect(result.data?.speed).toBe(1.5);
  });

  it('rejects missing text', () => {
    const result = validateTTSInput({}, true);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'text')).toBe(true);
  });

  it('rejects empty text', () => {
    const result = validateTTSInput({ text: '   ' }, true);
    expect(result.success).toBe(false);
  });

  it('enforces lower text limit for anonymous users', () => {
    const longText = 'x'.repeat(501);
    const anonResult = validateTTSInput({ text: longText }, false);
    expect(anonResult.success).toBe(false);

    const authResult = validateTTSInput({ text: longText }, true);
    expect(authResult.success).toBe(true); // Auth users get 4096
  });

  it('enforces higher text limit for authenticated users', () => {
    const tooLong = 'x'.repeat(4097);
    const result = validateTTSInput({ text: tooLong }, true);
    expect(result.success).toBe(false);
  });

  it('rejects invalid voice', () => {
    const result = validateTTSInput({ text: 'Hello', voice: 'invalid_voice' }, true);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'voice')).toBe(true);
  });

  it('rejects speed out of range', () => {
    expect(validateTTSInput({ text: 'Hello', speed: 0.1 }, true).success).toBe(false);
    expect(validateTTSInput({ text: 'Hello', speed: 5.0 }, true).success).toBe(false);
  });

  it('accepts speed at boundaries', () => {
    expect(validateTTSInput({ text: 'Hello', speed: 0.25 }, true).success).toBe(true);
    expect(validateTTSInput({ text: 'Hello', speed: 4.0 }, true).success).toBe(true);
  });

  it('rejects non-object body', () => {
    expect(validateTTSInput(null, true).success).toBe(false);
    expect(validateTTSInput('text', true).success).toBe(false);
  });
});

// ============================================================
// PAGINATION VALIDATION
// ============================================================

describe('validatePagination', () => {
  it('returns defaults when no params provided', () => {
    const params = new URLSearchParams();
    const result = validatePagination(params);
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(1);
    expect(result.data?.limit).toBe(20);
  });

  it('parses page and limit', () => {
    const params = new URLSearchParams({ page: '3', limit: '50' });
    const result = validatePagination(params);
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(3);
    expect(result.data?.limit).toBe(50);
  });

  it('caps limit at 100', () => {
    const params = new URLSearchParams({ limit: '999' });
    const result = validatePagination(params);
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(100);
  });

  it('rejects negative page', () => {
    const params = new URLSearchParams({ page: '-1' });
    const result = validatePagination(params);
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric page', () => {
    const params = new URLSearchParams({ page: 'abc' });
    const result = validatePagination(params);
    expect(result.success).toBe(false);
  });

  it('accepts valid sort field', () => {
    const params = new URLSearchParams({ sort: 'name' });
    const result = validatePagination(params);
    expect(result.success).toBe(true);
    expect(result.data?.sortBy).toBe('name');
  });

  it('rejects sort field not in allowlist', () => {
    const params = new URLSearchParams({ sort: 'password' });
    const result = validatePagination(params);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.field === 'sort')).toBe(true);
  });

  it('prevents SQL injection via sort', () => {
    const params = new URLSearchParams({ sort: 'name; DROP TABLE agents--' });
    const result = validatePagination(params);
    expect(result.success).toBe(false);
  });

  it('accepts valid sort order', () => {
    const params = new URLSearchParams({ order: 'desc' });
    const result = validatePagination(params);
    expect(result.success).toBe(true);
    expect(result.data?.sortOrder).toBe('desc');
  });

  it('rejects invalid sort order', () => {
    const params = new URLSearchParams({ order: 'sideways' });
    const result = validatePagination(params);
    expect(result.success).toBe(false);
  });

  it('uses custom allowed sort fields', () => {
    const params = new URLSearchParams({ sort: 'score' });
    const result = validatePagination(params, ['score', 'rank']);
    expect(result.success).toBe(true);
    expect(result.data?.sortBy).toBe('score');
  });
});

// ============================================================
// ID PARAM VALIDATION
// ============================================================

describe('validateIdParam', () => {
  it('accepts valid UUID', () => {
    const result = validateIdParam('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
    expect(result.data).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects null/undefined', () => {
    expect(validateIdParam(null).success).toBe(false);
    expect(validateIdParam(undefined).success).toBe(false);
  });

  it('rejects invalid UUID format', () => {
    expect(validateIdParam('not-a-uuid').success).toBe(false);
    expect(validateIdParam('12345').success).toBe(false);
  });
});

// ============================================================
// PLAN VALIDATION
// ============================================================

describe('isValidPlan', () => {
  it('accepts valid plans', () => {
    expect(isValidPlan('starter')).toBe(true);
    expect(isValidPlan('pro')).toBe(true);
    expect(isValidPlan('scale')).toBe(true);
    expect(isValidPlan('enterprise')).toBe(true);
  });

  it('rejects invalid plans', () => {
    expect(isValidPlan('free')).toBe(false);
    expect(isValidPlan('mega')).toBe(false);
    expect(isValidPlan('')).toBe(false);
  });
});

// ============================================================
// FORMAT VALIDATION ERRORS
// ============================================================

describe('formatValidationErrors', () => {
  it('returns first error as primary message', () => {
    const errors = [
      { field: 'name', message: 'Name is required', code: 'required' },
      { field: 'type', message: 'Type is required', code: 'required' },
    ];
    const result = formatValidationErrors(errors);
    expect(result.error).toBe('Name is required');
    expect(result.details).toHaveLength(2);
  });

  it('handles empty errors array', () => {
    const result = formatValidationErrors([]);
    expect(result.error).toBe('Validation failed');
    expect(result.details).toHaveLength(0);
  });
});

// ============================================================
// CONSTANTS VALIDATION
// ============================================================

describe('Constants', () => {
  it('VALID_AGENT_TYPES has expected types', () => {
    expect(VALID_AGENT_TYPES).toContain('customer_support');
    expect(VALID_AGENT_TYPES).toContain('voice');
    expect(VALID_AGENT_TYPES).toContain('custom');
    expect(VALID_AGENT_TYPES.length).toBe(8);
  });

  it('PLAN_AGENT_LIMITS has correct values', () => {
    expect(PLAN_AGENT_LIMITS.starter).toBe(3);
    expect(PLAN_AGENT_LIMITS.pro).toBe(15);
    expect(PLAN_AGENT_LIMITS.scale).toBe(Infinity);
    expect(PLAN_AGENT_LIMITS.enterprise).toBe(Infinity);
    expect(PLAN_AGENT_LIMITS.free).toBe(0);
  });
});
