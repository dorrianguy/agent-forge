import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and deployment verification.
 * Returns system status and checks connectivity to critical services.
 *
 * Usage:
 * - Load balancer health checks
 * - Deployment verification (e.g., after Railway/Vercel deploy)
 * - Uptime monitoring (e.g., BetterUptime, UptimeRobot)
 */

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    responseTime?: number;
  }[];
}

// Track when the server started
const startTime = Date.now();

async function checkSupabase(): Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string; responseTime?: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { status: 'warn', message: 'Supabase credentials not configured' };
  }

  const start = Date.now();
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    const responseTime = Date.now() - start;

    if (response.ok) {
      return { status: 'pass', responseTime };
    }
    return { status: 'warn', message: `Supabase returned ${response.status}`, responseTime };
  } catch (error) {
    return { status: 'fail', message: 'Supabase unreachable', responseTime: Date.now() - start };
  }
}

function checkStripe(): { status: 'pass' | 'fail' | 'warn'; message?: string } {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    return { status: 'warn', message: 'STRIPE_SECRET_KEY not configured' };
  }
  if (!webhookSecret) {
    return { status: 'warn', message: 'STRIPE_WEBHOOK_SECRET not configured' };
  }
  return { status: 'pass' };
}

function checkOpenAI(): { status: 'pass' | 'fail' | 'warn'; message?: string } {
  if (!process.env.OPENAI_API_KEY) {
    return { status: 'warn', message: 'OPENAI_API_KEY not configured (TTS unavailable)' };
  }
  return { status: 'pass' };
}

function checkResend(): { status: 'pass' | 'fail' | 'warn'; message?: string } {
  if (!process.env.RESEND_API_KEY) {
    return { status: 'warn', message: 'RESEND_API_KEY not configured (emails unavailable)' };
  }
  return { status: 'pass' };
}

export async function GET() {
  const supabaseCheck = await checkSupabase();
  const stripeCheck = checkStripe();
  const openaiCheck = checkOpenAI();
  const resendCheck = checkResend();

  const checks = [
    { name: 'supabase', ...supabaseCheck },
    { name: 'stripe', ...stripeCheck },
    { name: 'openai', ...openaiCheck },
    { name: 'resend', ...resendCheck },
  ];

  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarn = checks.some((c) => c.status === 'warn');

  const health: HealthCheck = {
    status: hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = hasFail ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
