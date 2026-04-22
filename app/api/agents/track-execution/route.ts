/**
 * Agent Execution Tracking Endpoint
 *
 * Call this endpoint when an agent executes to:
 * 1. Track the execution count
 * 2. Check usage limits
 * 3. Trigger usage alert emails at 75% and 90% thresholds
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { trackAgentExecution, hasExceededLimit, getUsagePercentage, PLAN_LIMITS } from '@/lib/usageService';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { user: null, error: 'Auth service not configured' };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, error: 'Authentication required' };
  }

  return { user, error: null };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, currentExecutions, agentId } = body;

    // Use authenticated user's info instead of trusting request body
    const userId = user.id;
    const email = user.email || '';
    const name = user.user_metadata?.name || email.split('@')[0];

    // Validate required fields
    if (!plan) {
      return NextResponse.json(
        { error: 'Missing required field: plan' },
        { status: 400 }
      );
    }

    const planLower = plan.toLowerCase();
    const limit = PLAN_LIMITS[planLower] ?? PLAN_LIMITS.free;

    // Check if user has already exceeded their limit
    if (hasExceededLimit(currentExecutions, plan)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usage limit exceeded',
          usagePercent: 100,
          limit,
          current: currentExecutions,
          upgradeUrl: '/pricing',
        },
        { status: 429 }
      );
    }

    // Track the execution and check for alerts
    const result = await trackAgentExecution(
      userId,
      email,
      name || 'there',
      plan,
      currentExecutions
    );

    const usagePercent = getUsagePercentage(result.newTotal, plan);

    return NextResponse.json({
      success: true,
      newTotal: result.newTotal,
      usagePercent,
      limit: limit === -1 ? 'unlimited' : limit,
      alertSent: result.alertTriggered,
      remainingExecutions: limit === -1 ? 'unlimited' : Math.max(0, limit - result.newTotal),
    });
  } catch (error) {
    console.error('Error tracking agent execution:', error);
    return NextResponse.json(
      { error: 'Failed to track execution', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check current usage status
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: authError || 'Authentication required' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const plan = searchParams.get('plan') || 'free';
  const currentExecutions = parseInt(searchParams.get('current') || '0', 10);

  const planLower = plan.toLowerCase();
  const limit = PLAN_LIMITS[planLower] ?? PLAN_LIMITS.free;
  const usagePercent = getUsagePercentage(currentExecutions, plan);
  const exceeded = hasExceededLimit(currentExecutions, plan);

  return NextResponse.json({
    plan: planLower,
    current: currentExecutions,
    limit: limit === -1 ? 'unlimited' : limit,
    usagePercent,
    exceeded,
    remainingExecutions: limit === -1 ? 'unlimited' : Math.max(0, limit - currentExecutions),
  });
}
