/**
 * Weekly Summary Cron Endpoint
 *
 * This endpoint is designed to be called by a cron service (like Vercel Cron)
 * to send weekly summary emails to all active users.
 *
 * Vercel Cron Config (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-summary",
 *     "schedule": "0 9 * * 1"  // Every Monday at 9 AM UTC
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWeeklyDigest } from '@/lib/usageService';
import { logger } from '@/lib/logger';

// Verify the cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // In production, you would:
    // 1. Query Supabase for all users with active subscriptions
    // 2. Get their weekly stats from your analytics/database
    // 3. Send personalized weekly summaries

    // For now, this is a placeholder that demonstrates the structure
    // Replace with actual database queries when Supabase is fully set up

    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    // Example: Mock data for demonstration
    // In production, query your database for real users and stats
    const mockUsers = [
      {
        email: 'demo@example.com',
        name: 'Demo User',
        stats: {
          agentsCreated: 2,
          totalExecutions: 150,
          successRate: 94,
          topAgent: 'Customer Support Bot',
        },
      },
    ];

    // Only send to mock users in development
    if (process.env.NODE_ENV === 'development') {
      for (const user of mockUsers) {
        const result = await sendWeeklyDigest(user.email, user.name, user.stats);
        results.push({
          email: user.email,
          success: result.success,
          error: result.error ? String(result.error) : undefined,
        });
      }
    }

    logger.info('Weekly summary cron completed', { processed: results.length });

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Weekly summary cron failed', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
