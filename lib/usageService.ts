/**
 * Usage Tracking Service - Agent Forge
 *
 * Tracks agent executions and triggers usage alerts at 75% and 90% thresholds.
 * Also provides functionality for weekly summary email triggers.
 */

import { sendUsageAlertEmail, sendWeeklySummaryEmail } from './emailService';
import config from '@/config.json';

// Plan limits derived from config.json (single source of truth)
// Uses conversations limit as the execution limit
export const PLAN_LIMITS: Record<string, number> = {
  free: 0,         // No agent executions on free tier (no free tier)
  starter: 1000,   // From config: 1,000 conversations/month
  professional: 10000, // From config: 10,000 conversations/month
  enterprise: -1,  // Unlimited (agents: -1 in config)
};

// Usage thresholds for alerts (percentage)
const ALERT_THRESHOLDS = [75, 90];

interface UsageData {
  userId: string;
  email: string;
  name: string;
  plan: string;
  currentUsage: number;
  limit: number;
  lastAlertSent?: number; // Last threshold that triggered an alert
}

/**
 * Check usage and send alert emails if thresholds are crossed
 */
export async function checkUsageAndAlert(usageData: UsageData): Promise<{
  shouldAlert: boolean;
  threshold?: number;
  alertSent?: boolean;
}> {
  const { email, name, currentUsage, limit, lastAlertSent } = usageData;

  // Skip if unlimited plan
  if (limit === -1) {
    return { shouldAlert: false };
  }

  // Skip if no usage limit
  if (limit <= 0) {
    return { shouldAlert: false };
  }

  const usagePercent = Math.round((currentUsage / limit) * 100);

  // Find the highest threshold that has been crossed but not yet alerted
  const thresholdToAlert = ALERT_THRESHOLDS
    .filter(t => usagePercent >= t && (!lastAlertSent || t > lastAlertSent))
    .sort((a, b) => b - a)[0];

  if (!thresholdToAlert) {
    return { shouldAlert: false };
  }

  // Send the usage alert email
  try {
    await sendUsageAlertEmail(email, name, usagePercent, limit, currentUsage);
    console.log(`Usage alert sent to ${email}: ${usagePercent}% (threshold: ${thresholdToAlert}%)`);
    return {
      shouldAlert: true,
      threshold: thresholdToAlert,
      alertSent: true,
    };
  } catch (error) {
    console.error('Failed to send usage alert email:', error);
    return {
      shouldAlert: true,
      threshold: thresholdToAlert,
      alertSent: false,
    };
  }
}

/**
 * Track an agent execution and check if usage alert is needed
 * This should be called every time an agent runs
 */
export async function trackAgentExecution(
  userId: string,
  email: string,
  name: string,
  plan: string,
  currentExecutions: number
): Promise<{ newTotal: number; alertTriggered: boolean }> {
  const newTotal = currentExecutions + 1;
  const limit = PLAN_LIMITS[plan.toLowerCase()] ?? PLAN_LIMITS.free;

  // Check if we need to send an alert
  const alertResult = await checkUsageAndAlert({
    userId,
    email,
    name,
    plan,
    currentUsage: newTotal,
    limit,
  });

  return {
    newTotal,
    alertTriggered: alertResult.alertSent ?? false,
  };
}

/**
 * Send weekly summary email with user stats
 * This should be called by a cron job weekly
 */
export async function sendWeeklyDigest(
  email: string,
  name: string,
  stats: {
    agentsCreated: number;
    totalExecutions: number;
    successRate: number;
    topAgent?: string;
  }
): Promise<{ success: boolean; error?: unknown }> {
  try {
    await sendWeeklySummaryEmail(email, name, stats);
    console.log(`Weekly summary sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send weekly summary:', error);
    return { success: false, error };
  }
}

/**
 * Get usage percentage for a user
 */
export function getUsagePercentage(currentUsage: number, plan: string): number {
  const limit = PLAN_LIMITS[plan.toLowerCase()] ?? PLAN_LIMITS.free;

  if (limit === -1) return 0; // Unlimited
  if (limit <= 0) return 100; // No access

  return Math.min(100, Math.round((currentUsage / limit) * 100));
}

/**
 * Check if user has exceeded their usage limit
 */
export function hasExceededLimit(currentUsage: number, plan: string): boolean {
  const limit = PLAN_LIMITS[plan.toLowerCase()] ?? PLAN_LIMITS.free;

  if (limit === -1) return false; // Unlimited
  if (limit <= 0) return true; // No access

  return currentUsage >= limit;
}
