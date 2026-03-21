/**
 * Agent Execution Tracking Endpoint
 *
 * Call this endpoint when an agent executes to:
 * 1. Track the execution count
 * 2. Check usage limits
 * 3. Trigger usage alert emails at 75% and 90% thresholds
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackAgentExecution, hasExceededLimit, getUsagePercentage, PLAN_LIMITS } from '@/lib/usageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name, plan, currentExecutions, agentId } = body;

    // Validate required fields
    if (!userId || !email || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, plan' },
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
