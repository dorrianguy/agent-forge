// =============================================================================
// Next.js Edge Middleware
// =============================================================================
//
// Runs on EVERY request. Applies security headers, CORS, rate limiting,
// and auth session validation for protected routes.
//
// NOTE: Edge middleware has limited API surface — no Node.js builtins.
// Rate limiting here uses a simple in-memory counter (resets per edge instance).
// The main rate limiting happens in API route handlers for accuracy.
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Routes that require authentication (redirect to /login if not authed) */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/launch',
  '/settings',
  '/api/launch',
];

/** Routes that are always public */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

/** Allowed CORS origins (configure via env var in production) */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

/** Apply security headers to the response */
function applySecurityHeaders(response: NextResponse): void {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO: tighten once CSP nonces are added
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
  }
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/** Apply CORS headers for API routes */
function applyCorsHeaders(request: NextRequest, response: NextResponse): void {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

// ---------------------------------------------------------------------------
// Edge Rate Limiting (lightweight — main limiting is in API handlers)
// ---------------------------------------------------------------------------

/** Simple per-IP counter for edge-level DoS protection */
const edgeCounters = new Map<string, { count: number; resetAt: number }>();

/** Max requests per IP per minute at the edge level */
const EDGE_RATE_LIMIT = 120;
const EDGE_WINDOW_MS = 60_000;

function checkEdgeRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = edgeCounters.get(ip);

  if (!entry || now > entry.resetAt) {
    edgeCounters.set(ip, { count: 1, resetAt: now + EDGE_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= EDGE_RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Auth Check (lightweight — full validation in API handlers)
// ---------------------------------------------------------------------------

/** Check if a route requires authentication */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/** Check if a route is explicitly public */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/** Check for presence of auth token (not full validation — that's in API handlers) */
function hasAuthToken(request: NextRequest): boolean {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return true;
  }

  // Check cookies
  const cookies = request.cookies;
  if (cookies.get('sb-access-token') || cookies.get('supabase-auth-token')) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Middleware Entry Point
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // --- Handle CORS preflight ---
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(request, response);
    applySecurityHeaders(response);
    return response;
  }

  // --- Edge rate limiting ---
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkEdgeRateLimit(ip)) {
    const response = NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
    response.headers.set('Retry-After', '60');
    applySecurityHeaders(response);
    return response;
  }

  // --- Auth check for protected routes ---
  // Skip in dev mode if Supabase isn't configured
  const supabaseConfigured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  if (supabaseConfigured && isProtectedRoute(pathname) && !isPublicRoute(pathname)) {
    if (!hasAuthToken(request)) {
      // API routes get 401, page routes get redirected
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 },
        );
        applySecurityHeaders(response);
        return response;
      }

      // Redirect to login page
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response);
      return response;
    }
  }

  // --- Apply headers and continue ---
  const response = NextResponse.next();
  applySecurityHeaders(response);
  applyCorsHeaders(request, response);

  return response;
}

// ---------------------------------------------------------------------------
// Matcher Configuration
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
