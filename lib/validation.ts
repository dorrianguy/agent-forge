/**
 * Centralized Input Validation Library for Agent Forge
 *
 * Now powered by Zod schemas (lib/schemas/) under the hood.
 * All original export signatures are preserved for backward compatibility.
 *
 * Migration: 2026-02-19  —  Zod-based rewrite
 */

import { z } from 'zod';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  buildTTSInputSchema,
  UUIDSchema,
  PaginationSchema,
  paginationWithSort,
  sanitizeString as _sanitizeString,
  sanitizeObject as _sanitizeObject,
  VALID_PLANS,
  PLAN_AGENT_LIMITS,
  VALID_AGENT_TYPES,
  VALID_AGENT_STATUSES,
} from './schemas';
import type {
  AgentType,
  AgentStatus,
  PlanType,
  CreateAgentInput as ZodCreateAgentInput,
  UpdateAgentInput as ZodUpdateAgentInput,
} from './schemas';

// ============================================================
// Re-export constants so existing imports keep working
// ============================================================

export { VALID_AGENT_TYPES, VALID_AGENT_STATUSES, VALID_PLANS, PLAN_AGENT_LIMITS };
export type { AgentType, AgentStatus, PlanType };

// ============================================================
// CORE VALIDATION TYPES (unchanged)
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
// LEGACY TYPE RE-EXPORTS (unchanged shape)
// ============================================================

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

export interface TTSInput {
  text: string;
  voice?: string;
  speed?: number;
}

export interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// SANITIZATION (delegate to schemas/common)
// ============================================================

export const sanitizeString = _sanitizeString;
export const sanitizeObject = _sanitizeObject;

// ============================================================
// STRING VALIDATORS
// ============================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
// Zod error → ValidationError[] converter
// ============================================================

function zodToValidationErrors(err: z.ZodError): ValidationError[] {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
    code: issue.code,
  }));
}

// ============================================================
// AGENT VALIDATION (now Zod-powered)
// ============================================================

export function validateCreateAgent(body: unknown): ValidationResult<CreateAgentInput> {
  const result = CreateAgentSchema.safeParse(body);
  if (!result.success) {
    return { success: false, errors: zodToValidationErrors(result.error) };
  }

  const d = result.data;
  return {
    success: true,
    data: {
      name: d.name,
      type: d.type,
      description: d.description ?? undefined,
      config: (d.config as Record<string, unknown>) ?? undefined,
    },
  };
}

export function validateUpdateAgent(body: unknown): ValidationResult<UpdateAgentInput> {
  const result = UpdateAgentSchema.safeParse(body);
  if (!result.success) {
    return { success: false, errors: zodToValidationErrors(result.error) };
  }

  const d = result.data;
  const data: UpdateAgentInput = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.type !== undefined) data.type = d.type;
  if (d.description !== undefined) data.description = d.description ?? undefined;
  if (d.status !== undefined) data.status = d.status;
  if (d.config !== undefined) data.config = (d.config as Record<string, unknown>) ?? undefined;

  return { success: true, data };
}

// ============================================================
// TTS VALIDATION (now Zod-powered)
// ============================================================

export function validateTTSInput(
  body: unknown,
  isAuthenticated: boolean,
): ValidationResult<TTSInput> {
  const schema = buildTTSInputSchema(isAuthenticated);
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, errors: zodToValidationErrors(result.error) };
  }

  const d = result.data;
  return {
    success: true,
    data: {
      text: d.text,
      voice: d.voice ?? undefined,
      speed: d.speed ?? undefined,
    },
  };
}

// ============================================================
// PAGINATION VALIDATION (now Zod-powered)
// ============================================================

export function validatePagination(
  searchParams: URLSearchParams,
  allowedSortFields: string[] = ['created_at', 'updated_at', 'name'],
): ValidationResult<PaginationInput> {
  const raw = {
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    sortBy: searchParams.get('sort') ?? searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('order') ?? searchParams.get('sortOrder') ?? undefined,
  };

  const schema = paginationWithSort(allowedSortFields);
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { success: false, errors: zodToValidationErrors(result.error) };
  }

  return { success: true, data: result.data };
}

// ============================================================
// BILLING VALIDATION
// ============================================================

export function isValidPlan(plan: string): plan is PlanType {
  return (VALID_PLANS as readonly string[]).includes(plan);
}

// ============================================================
// GENERIC HELPERS
// ============================================================

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

export function validateIdParam(
  id: string | undefined | null,
): ValidationResult<string> {
  if (!id) {
    return {
      success: false,
      errors: [
        { field: 'id', message: 'ID parameter is required', code: 'required' },
      ],
    };
  }

  const result = UUIDSchema.safeParse(id);
  if (!result.success) {
    return {
      success: false,
      errors: [
        {
          field: 'id',
          message: 'ID must be a valid UUID',
          code: 'invalid_format',
        },
      ],
    };
  }

  return { success: true, data: id };
}
