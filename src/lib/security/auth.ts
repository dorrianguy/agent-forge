// =============================================================================
// Authentication Foundation — Supabase Auth
// =============================================================================
//
// Provides authentication utilities for Next.js API routes using Supabase.
// Gracefully handles missing Supabase configuration (dev mode skips auth).
//
// Ported from Vigil's middleware/authorize.ts to Next.js HOF pattern.
// =============================================================================

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthSession, UserRole } from './types';

// ---------------------------------------------------------------------------
// Supabase Client Setup
// ---------------------------------------------------------------------------

/** Whether Supabase is configured (env vars present) */
const SUPABASE_CONFIGURED =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' &&
  process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0;

/** Lazily initialized Supabase admin client */
let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (service role).
 * Returns null if Supabase is not configured.
 *
 * @returns SupabaseClient or null
 */
function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null;

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseAdmin;
}

// ---------------------------------------------------------------------------
// Role Hierarchy
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
};

/**
 * Check if a role meets the minimum required role level.
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum role required
 * @returns True if the user's role is at or above the required level
 */
export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ---------------------------------------------------------------------------
// Session Extraction
// ---------------------------------------------------------------------------

/**
 * Extract and validate an auth session from the request.
 * Checks Authorization header (Bearer token) and cookies.
 *
 * Returns null if:
 * - Supabase is not configured (dev mode)
 * - No valid session token is found
 * - Token is expired or invalid
 *
 * @param req - Next.js API request
 * @returns AuthSession or null
 */
export async function getSession(req: NextApiRequest): Promise<AuthSession | null> {
  const admin = getSupabaseAdmin();

  // If Supabase isn't configured, return null (dev mode — auth skipped)
  if (!admin) {
    return null;
  }

  // Extract token from Authorization header or cookies
  const token = extractToken(req);
  if (!token) {
    return null;
  }

  try {
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    const user = data.user;

    // Extract role from user metadata (default to 'member')
    const role = (user.user_metadata?.role as UserRole) || 'member';

    return {
      userId: user.id,
      email: user.email || '',
      role,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(), // 1 hour
    };
  } catch {
    return null;
  }
}

/**
 * Extract the auth token from request headers or cookies.
 *
 * @param req - Next.js API request
 * @returns Token string or null
 */
function extractToken(req: NextApiRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies for Supabase session
  const cookies = req.cookies;
  if (cookies) {
    // Supabase SSR stores tokens in cookies with these patterns
    const tokenCookie =
      cookies['sb-access-token'] ||
      cookies['supabase-auth-token'];

    if (tokenCookie) {
      // supabase-auth-token is JSON-encoded [access_token, refresh_token]
      try {
        const parsed: unknown = JSON.parse(tokenCookie);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      } catch {
        // Not JSON, use as-is
        return tokenCookie;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Higher-Order Function: requireAuth
// ---------------------------------------------------------------------------

/** Extended request type with auth session attached */
export interface AuthenticatedRequest extends NextApiRequest {
  session: AuthSession;
}

/**
 * Wrap a Next.js API handler with authentication.
 * If Supabase is not configured, auth is skipped (dev mode).
 * If auth fails, returns 401 Unauthorized.
 *
 * @param handler - Next.js API handler that requires authentication
 * @returns Wrapped handler with auth check
 *
 * @example
 * ```ts
 * export default requireAuth(async (req, res) => {
 *   console.log(req.session.userId);
 *   res.json({ ok: true });
 * });
 * ```
 */
export function requireAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => void | Promise<void>,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Dev mode: skip auth if Supabase not configured
    if (!SUPABASE_CONFIGURED) {
      const devSession: AuthSession = {
        userId: 'dev-user',
        email: 'dev@localhost',
        role: 'admin',
        expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      };
      (req as AuthenticatedRequest).session = devSession;
      return handler(req as AuthenticatedRequest, res);
    }

    const session = await getSession(req);

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication required. Include a Bearer token or session cookie.',
      });
    }

    (req as AuthenticatedRequest).session = session;
    return handler(req as AuthenticatedRequest, res);
  };
}

// ---------------------------------------------------------------------------
// Higher-Order Function: requireRole
// ---------------------------------------------------------------------------

/**
 * Wrap a Next.js API handler with role-based access control.
 * Must be used after (or nested within) requireAuth.
 *
 * @param role - Minimum role required to access the endpoint
 * @param handler - Next.js API handler
 * @returns Wrapped handler with auth + role check
 *
 * @example
 * ```ts
 * export default requireRole('admin', async (req, res) => {
 *   // Only admins reach here
 *   res.json({ ok: true });
 * });
 * ```
 */
export function requireRole(
  role: UserRole,
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => void | Promise<void>,
): NextApiHandler {
  return requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!isRoleAtLeast(req.session.role, role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint requires at least '${role}' role.`,
      });
    }

    return handler(req, res);
  });
}
