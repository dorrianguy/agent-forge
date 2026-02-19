/**
 * Tests for lib/usageService.ts
 *
 * Covers:
 * - Plan limits configuration
 * - Usage percentage calculation
 * - Limit exceeded checks
 * - Usage alert threshold logic
 * - Agent execution tracking
 * - Weekly digest sending
 * - Edge cases: unlimited plans, free tier, boundary values
 */

// Mock emailService before importing
const mockSendUsageAlertEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendWeeklySummaryEmail = jest.fn().mockResolvedValue({ success: true });

jest.mock('@/lib/emailService', () => ({
  sendUsageAlertEmail: (...args: any[]) => mockSendUsageAlertEmail(...args),
  sendWeeklySummaryEmail: (...args: any[]) => mockSendWeeklySummaryEmail(...args),
}));

// Mock config.json
jest.mock('@/config.json', () => ({
  pricing: {
    starter: { conversations: 1000 },
    professional: { conversations: 10000 },
    enterprise: { agents: -1 },
  },
}), { virtual: true });

import {
  PLAN_LIMITS,
  checkUsageAndAlert,
  trackAgentExecution,
  sendWeeklyDigest,
  getUsagePercentage,
  hasExceededLimit,
} from '@/lib/usageService';

describe('usageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendUsageAlertEmail.mockResolvedValue({ success: true });
    mockSendWeeklySummaryEmail.mockResolvedValue({ success: true });
  });

  // ── Plan Limits ──────────────────────────────────────────────────

  describe('PLAN_LIMITS', () => {
    it('should define limits for free tier', () => {
      expect(PLAN_LIMITS.free).toBe(0);
    });

    it('should define limits for starter tier', () => {
      expect(PLAN_LIMITS.starter).toBe(1000);
    });

    it('should define limits for professional tier', () => {
      expect(PLAN_LIMITS.professional).toBe(10000);
    });

    it('should define unlimited for enterprise tier', () => {
      expect(PLAN_LIMITS.enterprise).toBe(-1);
    });
  });

  // ── getUsagePercentage ───────────────────────────────────────────

  describe('getUsagePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(getUsagePercentage(500, 'starter')).toBe(50);
    });

    it('should return 0 for enterprise (unlimited)', () => {
      expect(getUsagePercentage(99999, 'enterprise')).toBe(0);
    });

    it('should return 100 for free tier (no access)', () => {
      expect(getUsagePercentage(0, 'free')).toBe(100);
    });

    it('should cap at 100%', () => {
      expect(getUsagePercentage(2000, 'starter')).toBe(100);
    });

    it('should return 100 for unknown plan (defaults to free)', () => {
      expect(getUsagePercentage(1, 'nonexistent')).toBe(100);
    });

    it('should handle zero usage', () => {
      expect(getUsagePercentage(0, 'starter')).toBe(0);
    });

    it('should round to nearest integer', () => {
      // 333/1000 = 33.3%
      expect(getUsagePercentage(333, 'starter')).toBe(33);
    });

    it('should handle exact limit', () => {
      expect(getUsagePercentage(1000, 'starter')).toBe(100);
    });

    it('should handle case-insensitive plan names via toLowerCase', () => {
      // The function calls plan.toLowerCase(), so "Starter" → "starter"
      expect(getUsagePercentage(500, 'Starter')).toBe(50);
    });
  });

  // ── hasExceededLimit ─────────────────────────────────────────────

  describe('hasExceededLimit', () => {
    it('should return false when under limit', () => {
      expect(hasExceededLimit(999, 'starter')).toBe(false);
    });

    it('should return true when at limit', () => {
      expect(hasExceededLimit(1000, 'starter')).toBe(true);
    });

    it('should return true when over limit', () => {
      expect(hasExceededLimit(1001, 'starter')).toBe(true);
    });

    it('should return false for enterprise (unlimited)', () => {
      expect(hasExceededLimit(999999, 'enterprise')).toBe(false);
    });

    it('should return true for free tier', () => {
      expect(hasExceededLimit(0, 'free')).toBe(true);
    });

    it('should return true for unknown plan', () => {
      expect(hasExceededLimit(1, 'mystery_plan')).toBe(true);
    });

    it('should handle professional tier correctly', () => {
      expect(hasExceededLimit(9999, 'professional')).toBe(false);
      expect(hasExceededLimit(10000, 'professional')).toBe(true);
    });
  });

  // ── checkUsageAndAlert ───────────────────────────────────────────

  describe('checkUsageAndAlert', () => {
    it('should not alert when under 75% threshold', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 500,
        limit: 1000,
      });

      expect(result.shouldAlert).toBe(false);
      expect(mockSendUsageAlertEmail).not.toHaveBeenCalled();
    });

    it('should alert at 75% threshold', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 750,
        limit: 1000,
      });

      expect(result.shouldAlert).toBe(true);
      expect(result.threshold).toBe(75);
      expect(mockSendUsageAlertEmail).toHaveBeenCalledWith(
        'user@example.com', 'Alice', 75, 1000, 750
      );
    });

    it('should alert at 90% threshold', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 900,
        limit: 1000,
      });

      expect(result.shouldAlert).toBe(true);
      expect(result.threshold).toBe(90);
    });

    it('should not re-alert for already-alerted threshold', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 800,
        limit: 1000,
        lastAlertSent: 75,
      });

      expect(result.shouldAlert).toBe(false);
      expect(mockSendUsageAlertEmail).not.toHaveBeenCalled();
    });

    it('should alert for 90% when 75% was already sent', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 920,
        limit: 1000,
        lastAlertSent: 75,
      });

      expect(result.shouldAlert).toBe(true);
      expect(result.threshold).toBe(90);
    });

    it('should not alert for unlimited plans', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'enterprise',
        currentUsage: 999999,
        limit: -1,
      });

      expect(result.shouldAlert).toBe(false);
    });

    it('should not alert when limit is zero or negative', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'free',
        currentUsage: 0,
        limit: 0,
      });

      expect(result.shouldAlert).toBe(false);
    });

    it('should handle email send failure gracefully', async () => {
      mockSendUsageAlertEmail.mockRejectedValue(new Error('Email service down'));

      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 800,
        limit: 1000,
      });

      expect(result.shouldAlert).toBe(true);
      expect(result.alertSent).toBe(false);
    });

    it('should report alertSent as true when email succeeds', async () => {
      const result = await checkUsageAndAlert({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'Alice',
        plan: 'starter',
        currentUsage: 760,
        limit: 1000,
      });

      expect(result.alertSent).toBe(true);
    });
  });

  // ── trackAgentExecution ──────────────────────────────────────────

  describe('trackAgentExecution', () => {
    it('should increment execution count', async () => {
      const result = await trackAgentExecution(
        'user-1', 'user@example.com', 'Alice', 'starter', 10
      );

      expect(result.newTotal).toBe(11);
    });

    it('should not trigger alert for low usage', async () => {
      const result = await trackAgentExecution(
        'user-1', 'user@example.com', 'Alice', 'starter', 100
      );

      expect(result.alertTriggered).toBe(false);
    });

    it('should trigger alert at 75% usage', async () => {
      const result = await trackAgentExecution(
        'user-1', 'user@example.com', 'Alice', 'starter', 749
      );

      // 749 + 1 = 750 = 75%
      expect(result.newTotal).toBe(750);
      expect(result.alertTriggered).toBe(true);
    });

    it('should trigger alert at 90% usage', async () => {
      const result = await trackAgentExecution(
        'user-1', 'user@example.com', 'Alice', 'starter', 899
      );

      // 899 + 1 = 900 = 90%
      expect(result.newTotal).toBe(900);
      expect(result.alertTriggered).toBe(true);
    });

    it('should handle enterprise plan without alerts', async () => {
      const result = await trackAgentExecution(
        'user-1', 'user@example.com', 'Alice', 'enterprise', 50000
      );

      expect(result.newTotal).toBe(50001);
      expect(result.alertTriggered).toBe(false);
    });

    it('should handle email failure gracefully', async () => {
      mockSendUsageAlertEmail.mockRejectedValue(new Error('fail'));

      const result = await trackAgentExecution(
        'user-1', 'user@example.com', 'Alice', 'starter', 749
      );

      expect(result.newTotal).toBe(750);
      expect(result.alertTriggered).toBe(false); // Failed to send
    });
  });

  // ── sendWeeklyDigest ─────────────────────────────────────────────

  describe('sendWeeklyDigest', () => {
    it('should send weekly summary email', async () => {
      const stats = {
        agentsCreated: 5,
        totalExecutions: 2000,
        successRate: 98,
        topAgent: 'Sales Bot',
      };

      const result = await sendWeeklyDigest('user@example.com', 'Alice', stats);

      expect(result.success).toBe(true);
      expect(mockSendWeeklySummaryEmail).toHaveBeenCalledWith(
        'user@example.com', 'Alice', stats
      );
    });

    it('should handle email failure gracefully', async () => {
      mockSendWeeklySummaryEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await sendWeeklyDigest('user@example.com', 'Alice', {
        agentsCreated: 0,
        totalExecutions: 0,
        successRate: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should work with minimal stats', async () => {
      const result = await sendWeeklyDigest('user@example.com', 'Bob', {
        agentsCreated: 0,
        totalExecutions: 0,
        successRate: 0,
      });

      expect(result.success).toBe(true);
    });
  });
});
