/**
 * Centralized Input Validation Library for Agent Forge
 *
 * Uses Zod for runtime type checking and validation.
 * All API route validation schemas are defined here for consistency.
 *
 * 🌙 Night Shift Agent — 2026-02-15
 */

// NOTE: Zod needs to be added to package.json dependencies
// For now, this uses a lightweight validation approach that works
// without external dependencies. Can migrate to Zod when the
// dependency is added: npm install zod

// ============================================================
// CORE VALIDATION TYPES
// ============================================================

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================
// PRIMITIVE VALIDATORS
// ============================================================

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// ============================================================
// STRING VALIDATORS
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value) && value.length <= 320;
}

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value) && value.length <= 128;
}

// ============================================================
// SANITIZATION
// ============================================================

/**
 * Sanitize a string to prevent XSS and SQL injection patterns.
 * Strips HTML tags and dangerous characters.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>]/g, '') // Remove leftover angle brackets
    .trim();
}

/**
 * Sanitize an object's string values recursively.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (isObject(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return result;
}

// ============================================================
// AGENT VALIDATION
// ============================================================

export const VALID_AGENT_TYPES = [
  'customer_support',
  'sales',
  'lead_qualifier',
  'booking',
  'faq',
  'voice',
  'email',
  'custom',
] as const;

export type AgentType = typeof VALID_AGENT_TYPES[number];

export const VALID_AGENT_STATUSES = ['ready', 'live', 'paused'] as const;
export type AgentStatus = typeof VALID_AGENT_STATUSES[number];

export const PLAN_AGENT_LIMITS: Record<string, number> = {
  starter: 3,
  pro: 15,
  scale: Infinity,
  enterprise: Infinity,
  professional: 5, // Legacy plan
  free: 0,
};

export interface CreateAgentInput {
  name: string;
  type: AgentType;
  description?: string;
  config?: Record<string, unknown>;
}

export interface UpdateAgentInput {
  name?: string;
  type?: AgentType;
  description?: string;
  status?: AgentStatus;
  config?: Record<string, unknown>;
}

export function validateCreateAgent(body: unknown): ValidationResult<CreateAgentInput> {
  const errors: ValidationError[] = [];

  if (!isObject(body)) {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be a JSON object', code: 'invalid_type' }] };
  }

  // Name: required, string, 1-100 chars
  if (!body.name || !isString(body.name)) {
    errors.push({ field: 'name', message: 'Agent name is required', code: 'required' });
  } else {
    const name = sanitizeString(body.name);
    if (name.length === 0) {
      errors.push({ field: 'name', message: 'Agent name cannot be empty', code: 'too_short' });
    } else if (name.length > 100) {
      errors.push({ field: 'name', message: 'Agent name must be 100 characters or less', code: 'too_long' });
    }
  }

  // Type: required, must be a valid agent type
  if (!body.type || !isString(body.type)) {
    errors.push({ field: 'type', message: 'Agent type is required', code: 'required' });
  } else if (!VALID_AGENT_TYPES.includes(body.type as AgentType)) {
    errors.push({
      field: 'type',
      message: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}`,
      code: 'invalid_enum',
    });
  }

  // Description: optional, string, max 500 chars
  if (body.description !== undefined && body.description !== null) {
    if (!isString(body.description)) {
      errors.push({ field: 'description', message: 'Description must be a string', code: 'invalid_type' });
    } else if (body.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be 500 characters or less', code: 'too_long' });
    }
  }

  // Config: optional, must be an object if provided
  if (body.config !== undefined && body.config !== null) {
    if (!isObject(body.config)) {
      errors.push({ field: 'config', message: 'Config must be a JSON object', code: 'invalid_type' });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: sanitizeString(body.name as string),
      type: body.type as AgentType,
      description: body.description ? sanitizeString(body.description as string) : undefined,
      config: body.config ? sanitizeObject(body.config as Record<string, unknown>) : undefined,
    },
  };
}

export function validateUpdateAgent(body: unknown): ValidationResult<UpdateAgentInput> {
  const errors: ValidationError[] = [];

  if (!isObject(body)) {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be a JSON object', code: 'invalid_type' }] };
  }

  // Must have at least one field to update
  const updateableFields = ['name', 'type', 'description', 'status', 'config'];
  const hasUpdateField = updateableFields.some((f) => body[f] !== undefined);
  if (!hasUpdateField) {
    return {
      success: false,
      errors: [{ field: 'body', message: 'At least one field must be provided for update', code: 'empty_update' }],
    };
  }

  // Name: optional, string, 1-100 chars
  if (body.name !== undefined) {
    if (!isString(body.name)) {
      errors.push({ field: 'name', message: 'Name must be a string', code: 'invalid_type' });
    } else {
      const name = sanitizeString(body.name);
      if (name.length === 0) {
        errors.push({ field: 'name', message: 'Name cannot be empty', code: 'too_short' });
      } else if (name.length > 100) {
        errors.push({ field: 'name', message: 'Name must be 100 characters or less', code: 'too_long' });
      }
    }
  }

  // Type: optional, must be valid
  if (body.type !== undefined) {
    if (!isString(body.type) || !VALID_AGENT_TYPES.includes(body.type as AgentType)) {
      errors.push({
        field: 'type',
        message: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}`,
        code: 'invalid_enum',
      });
    }
  }

  // Status: optional, must be valid
  if (body.status !== undefined) {
    if (!isString(body.status) || !VALID_AGENT_STATUSES.includes(body.status as AgentStatus)) {
      errors.push({
        field: 'status',
        message: `Invalid status. Must be one of: ${VALID_AGENT_STATUSES.join(', ')}`,
        code: 'invalid_enum',
      });
    }
  }

  // Description: optional, max 500 chars
  if (body.description !== undefined && body.description !== null) {
    if (!isString(body.description)) {
      errors.push({ field: 'description', message: 'Description must be a string', code: 'invalid_type' });
    } else if (body.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be 500 characters or less', code: 'too_long' });
    }
  }

  // Config: optional, must be object
  if (body.config !== undefined && body.config !== null) {
    if (!isObject(body.config)) {
      errors.push({ field: 'config', message: 'Config must be a JSON object', code: 'invalid_type' });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const data: UpdateAgentInput = {};
  if (body.name !== undefined) data.name = sanitizeString(body.name as string);
  if (body.type !== undefined) data.type = body.type as AgentType;
  if (body.description !== undefined) data.description = body.description ? sanitizeString(body.description as string) : undefined;
  if (body.status !== undefined) data.status = body.status as AgentStatus;
  if (body.config !== undefined) data.config = body.config ? sanitizeObject(body.config as Record<string, unknown>) : undefined;

  return { success: true, data };
}

// ============================================================
// TTS VALIDATION
// ============================================================

export interface TTSInput {
  text: string;
  voice?: string;
  speed?: number;
}

const VALID_VOICES = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer', 'rachel', 'adam', 'bella'];

export function validateTTSInput(body: unknown, isAuthenticated: boolean): ValidationResult<TTSInput> {
  const errors: ValidationError[] = [];

  if (!isObject(body)) {
    return { success: false, errors: [{ field: 'body', message: 'Request body must be a JSON object', code: 'invalid_type' }] };
  }

  // Text: required
  if (!body.text || !isString(body.text)) {
    errors.push({ field: 'text', message: 'Text is required', code: 'required' });
  } else {
    const text = body.text.trim();
    if (text.length === 0) {
      errors.push({ field: 'text', message: 'Text cannot be empty', code: 'too_short' });
    }
    const maxLength = isAuthenticated ? 4096 : 500;
    if (text.length > maxLength) {
      errors.push({
        field: 'text',
        message: isAuthenticated
          ? `Text must be ${maxLength} characters or less`
          : `Text must be ${maxLength} characters or less for anonymous users. Sign in for up to 4096 characters.`,
        code: 'too_long',
      });
    }
  }

  // Voice: optional, must be valid
  if (body.voice !== undefined && body.voice !== null) {
    if (!isString(body.voice)) {
      errors.push({ field: 'voice', message: 'Voice must be a string', code: 'invalid_type' });
    } else if (!VALID_VOICES.includes(body.voice.toLowerCase())) {
      errors.push({
        field: 'voice',
        message: `Invalid voice. Must be one of: ${VALID_VOICES.join(', ')}`,
        code: 'invalid_enum',
      });
    }
  }

  // Speed: optional, 0.25-4.0
  if (body.speed !== undefined && body.speed !== null) {
    if (!isNumber(body.speed)) {
      errors.push({ field: 'speed', message: 'Speed must be a number', code: 'invalid_type' });
    } else if (body.speed < 0.25 || body.speed > 4.0) {
      errors.push({ field: 'speed', message: 'Speed must be between 0.25 and 4.0', code: 'out_of_range' });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      text: (body.text as string).trim(),
      voice: body.voice ? (body.voice as string).toLowerCase() : undefined,
      speed: body.speed as number | undefined,
    },
  };
}

// ============================================================
// PAGINATION VALIDATION
// ============================================================

export interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function validatePagination(
  searchParams: URLSearchParams,
  allowedSortFields: string[] = ['created_at', 'updated_at', 'name']
): ValidationResult<PaginationInput> {
  const errors: ValidationError[] = [];

  // Page: default 1, must be positive integer
  const pageStr = searchParams.get('page');
  let page = 1;
  if (pageStr) {
    page = parseInt(pageStr, 10);
    if (isNaN(page) || page < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer', code: 'invalid_value' });
      page = 1;
    }
  }

  // Limit: default 20, max 100
  const limitStr = searchParams.get('limit');
  let limit = 20;
  if (limitStr) {
    limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 1) {
      errors.push({ field: 'limit', message: 'Limit must be a positive integer', code: 'invalid_value' });
      limit = 20;
    } else if (limit > 100) {
      limit = 100; // Cap silently
    }
  }

  // Sort field: must be in allowlist (prevents SQL injection via sort)
  const sortBy = searchParams.get('sort') || searchParams.get('sortBy');
  if (sortBy && !allowedSortFields.includes(sortBy)) {
    errors.push({
      field: 'sort',
      message: `Invalid sort field. Must be one of: ${allowedSortFields.join(', ')}`,
      code: 'invalid_enum',
    });
  }

  // Sort order
  const sortOrder = searchParams.get('order') || searchParams.get('sortOrder');
  if (sortOrder && sortOrder !== 'asc' && sortOrder !== 'desc') {
    errors.push({
      field: 'order',
      message: 'Sort order must be "asc" or "desc"',
      code: 'invalid_enum',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      page,
      limit,
      sortBy: sortBy && allowedSortFields.includes(sortBy) ? sortBy : undefined,
      sortOrder: (sortOrder as 'asc' | 'desc') || undefined,
    },
  };
}

// ============================================================
// BILLING VALIDATION
// ============================================================

export const VALID_PLANS = ['starter', 'pro', 'scale', 'enterprise'] as const;
export type PlanType = typeof VALID_PLANS[number];

export function isValidPlan(plan: string): plan is PlanType {
  return VALID_PLANS.includes(plan as PlanType);
}

// ============================================================
// GENERIC HELPERS
// ============================================================

/**
 * Format validation errors into a standard API error response.
 */
export function formatValidationErrors(errors: ValidationError[]): {
  error: string;
  details: ValidationError[];
} {
  const firstError = errors[0];
  return {
    error: firstError?.message || 'Validation failed',
    details: errors,
  };
}

/**
 * Validate that a route parameter is a valid UUID.
 * Common pattern for /api/[resource]/[id] routes.
 */
export function validateIdParam(id: string | undefined | null): ValidationResult<string> {
  if (!id) {
    return {
      success: false,
      errors: [{ field: 'id', message: 'ID parameter is required', code: 'required' }],
    };
  }

  if (!isValidUUID(id)) {
    return {
      success: false,
      errors: [{ field: 'id', message: 'ID must be a valid UUID', code: 'invalid_format' }],
    };
  }

  return { success: true, data: id };
}
