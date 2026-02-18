/**
 * API Route Helper Utilities for Agent Forge
 *
 * Reduces boilerplate in API routes by providing common patterns:
 * - Authentication
 * - Error responses
 * - Server-side Supabase client creation
 * - Request parsing
 *
 * 🌙 Night Shift Agent — 2026-02-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from './logger';
import { checkRateLimitAsync, getRateLimitHeaders, type RateLimitConfig } from './rateLimit';
import { formatValidationErrors, type ValidationError } from './validation';

// ============================================================
// TYPES
// ============================================================

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface ApiContext {
  user: AuthenticatedUser;
  supabase: ReturnType<typeof createServerClient>;
}

export interface ApiErrorOptions {
  status: number;
  error: string;
  details?: unknown;
  headers?: Record<string, string>;
}

// ============================================================
// SERVER-SIDE SUPABASE CLIENT
// ============================================================

/**
 * Create a Supabase client for server-side use in API routes.
 * This properly handles cookies for session management in Next.js App Router.
 *
 * Returns null if Supabase env vars are not configured.
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase environment variables not configured');
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Authenticate the current request and return user + supabase client.
 * Returns null if not authenticated.
 */
export async function authenticateRequest(): Promise<ApiContext | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      supabase,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication — returns context or sends 401 response.
 * Use in API route handlers like:
 *
 * ```ts
 * const auth = await requireAuth();
 * if (auth instanceof NextResponse) return auth;
 * // auth is now ApiContext
 * ```
 */
export async function requireAuth(): Promise<ApiContext | NextResponse> {
  const context = await authenticateRequest();
  if (!context) {
    return errorResponse({
      status: 401,
      error: 'Authentication required',
    });
  }
  return context;
}

// ============================================================
// RATE LIMITING
// ============================================================

/**
 * Apply rate limiting to a request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 */
export async function applyRateLimit(
  request: NextRequest,
  userId: string | null,
  config: RateLimitConfig & { prefix?: string }
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') || 'unknown';

  const prefix = config.prefix || 'api';
  const identifier = userId ? `${prefix}:user:${userId}` : `${prefix}:anon:${ip}`;

  const result = await checkRateLimitAsync(identifier, {
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });

  if (!result.success) {
    logger.warn('Rate limit exceeded', { identifier, ip, userId });
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(result) }
    );
  }

  return null;
}

// ============================================================
// ERROR RESPONSES
// ============================================================

/**
 * Standard error response builder.
 */
export function errorResponse(options: ApiErrorOptions): NextResponse {
  const body: Record<string, unknown> = { error: options.error };
  if (options.details) {
    body.details = options.details;
  }

  return NextResponse.json(body, {
    status: options.status,
    headers: options.headers,
  });
}

/**
 * Validation error response (400).
 */
export function validationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(formatValidationErrors(errors), { status: 400 });
}

/**
 * Not found response (404).
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse({ status: 404, error: `${resource} not found` });
}

/**
 * Forbidden response (403).
 */
export function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return errorResponse({ status: 403, error: message });
}

/**
 * Internal server error response (500).
 */
export function serverErrorResponse(message: string = 'Internal server error'): NextResponse {
  return errorResponse({ status: 500, error: message });
}

// ============================================================
// REQUEST PARSING
// ============================================================

/**
 * Safely parse JSON body from a request.
 * Returns null on parse failure.
 */
export async function parseJsonBody<T = unknown>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Get the client IP address from the request.
 */
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

/**
 * JSON success response with consistent formatting.
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Created response (201) for POST operations.
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * No content response (204) for DELETE operations.
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================================
// CORS HELPERS (for API routes that need cross-origin access)
// ============================================================

const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight OPTIONS request.
 */
export function corsPreflightResponse(allowedOrigins?: string[]): NextResponse {
  const headers = { ...DEFAULT_CORS_HEADERS };

  if (allowedOrigins && allowedOrigins.length > 0) {
    headers['Access-Control-Allow-Origin'] = allowedOrigins.join(', ');
  }

  return new NextResponse(null, { status: 204, headers });
}

/**
 * Add CORS headers to an existing response.
 */
export function withCors(response: NextResponse, allowedOrigins?: string[]): NextResponse {
  const origin = allowedOrigins && allowedOrigins.length > 0
    ? allowedOrigins.join(', ')
    : '*';

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

// ============================================================
// PROFILE HELPERS
// ============================================================

/**
 * Fetch the user's profile/plan from Supabase.
 * Returns null if not found.
 */
export async function getUserProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Check if user's plan allows a specific agent count.
 */
export async function checkAgentLimit(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  currentCount: number,
  planLimits: Record<string, number>
): Promise<{ allowed: boolean; limit: number; plan: string }> {
  const profile = await getUserProfile(supabase, userId);
  const plan = profile?.plan || 'free';
  const limit = planLimits[plan] ?? 0;

  return {
    allowed: limit === Infinity || currentCount < limit,
    limit: limit === Infinity ? -1 : limit,
    plan,
  };
}
