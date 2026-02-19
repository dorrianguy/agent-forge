/**
 * Tests for lib/emailService.ts
 *
 * Covers:
 * - Welcome email generation and sending
 * - Payment success email with invoice URL
 * - Payment failed email with retry date
 * - Subscription canceled email with end date
 * - Usage alert email at various thresholds
 * - Weekly summary email with stats
 * - Error handling when Resend SDK fails
 * - HTML template structure validation
 */

// Mock the Resend SDK before importing
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendUsageAlertEmail,
  sendWeeklySummaryEmail,
} from '@/lib/emailService';

describe('emailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'msg_test_123' }, error: null });
  });

  // ── Welcome Email ────────────────────────────────────────────────

  describe('sendWelcomeEmail', () => {
    it('should send a welcome email with correct parameters', async () => {
      const result = await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);

      const call = mockSend.mock.calls[0][0];
      expect(call.to).toBe('user@example.com');
      expect(call.subject).toBe('Welcome to Agent Forge!');
      expect(call.html).toContain('Alice');
      expect(call.html).toContain('Starter');
    });

    it('should include dashboard link in welcome email', async () => {
      await sendWelcomeEmail('user@example.com', 'Bob', 'Professional');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('/dashboard');
      expect(call.html).toContain('Go to Dashboard');
    });

    it('should include getting started tips', async () => {
      await sendWelcomeEmail('user@example.com', 'Charlie', 'Enterprise');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('Getting Started');
      expect(call.html).toContain('first AI agent');
    });

    it('should handle Resend SDK error response', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

      const result = await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Resend SDK throwing an exception', async () => {
      mockSend.mockRejectedValue(new Error('Network timeout'));

      const result = await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use correct from address', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBeDefined();
      expect(typeof call.from).toBe('string');
    });
  });

  // ── Payment Success Email ────────────────────────────────────────

  describe('sendPaymentSuccessEmail', () => {
    it('should send payment success email with formatted amount', async () => {
      const result = await sendPaymentSuccessEmail(
        'user@example.com', 'Alice', 4900, 'Starter'
      );

      expect(result.success).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toBe('Payment Received - Agent Forge');
      expect(call.html).toContain('49.00');
      expect(call.html).toContain('Starter');
      expect(call.html).toContain('Alice');
    });

    it('should include invoice URL when provided', async () => {
      await sendPaymentSuccessEmail(
        'user@example.com', 'Bob', 9900, 'Professional',
        'https://stripe.com/invoice/abc123'
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('View Invoice');
      expect(call.html).toContain('https://stripe.com/invoice/abc123');
    });

    it('should not include invoice button when no URL provided', async () => {
      await sendPaymentSuccessEmail(
        'user@example.com', 'Bob', 9900, 'Professional'
      );

      const call = mockSend.mock.calls[0][0];
      // The View Invoice button should not be in the HTML
      expect(call.html).not.toContain('View Invoice');
    });

    it('should format cents to dollars correctly', async () => {
      // $499.00 = 49900 cents
      await sendPaymentSuccessEmail('user@example.com', 'Alice', 49900, 'Enterprise');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('499.00');
    });

    it('should format small amounts correctly', async () => {
      // $1.00 = 100 cents
      await sendPaymentSuccessEmail('user@example.com', 'Alice', 100, 'Starter');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('1.00');
    });

    it('should handle zero amount', async () => {
      await sendPaymentSuccessEmail('user@example.com', 'Alice', 0, 'Free');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('0.00');
    });

    it('should handle Resend error', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } });
      const result = await sendPaymentSuccessEmail('user@example.com', 'Alice', 4900, 'Starter');
      expect(result.success).toBe(false);
    });
  });

  // ── Payment Failed Email ─────────────────────────────────────────

  describe('sendPaymentFailedEmail', () => {
    it('should send payment failed email with details', async () => {
      const result = await sendPaymentFailedEmail(
        'user@example.com', 'Alice', 4900, 'Starter'
      );

      expect(result.success).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toBe('Payment Failed - Action Required');
      expect(call.html).toContain('49.00');
      expect(call.html).toContain('Starter');
      expect(call.html).toContain('Failed');
    });

    it('should include retry date when provided', async () => {
      await sendPaymentFailedEmail(
        'user@example.com', 'Alice', 4900, 'Starter', '2/25/2026'
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('2/25/2026');
    });

    it('should show generic retry message when no retry date', async () => {
      await sendPaymentFailedEmail(
        'user@example.com', 'Alice', 4900, 'Starter'
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('in a few days');
    });

    it('should include billing page link', async () => {
      await sendPaymentFailedEmail('user@example.com', 'Alice', 4900, 'Starter');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('/billing');
      expect(call.html).toContain('Update Payment Method');
    });

    it('should handle Resend SDK exception', async () => {
      mockSend.mockRejectedValue(new Error('Connection refused'));
      const result = await sendPaymentFailedEmail('user@example.com', 'Alice', 4900, 'Starter');
      expect(result.success).toBe(false);
    });
  });

  // ── Subscription Canceled Email ──────────────────────────────────

  describe('sendSubscriptionCanceledEmail', () => {
    it('should send cancellation email with end date', async () => {
      const result = await sendSubscriptionCanceledEmail(
        'user@example.com', 'Alice', 'Professional', '3/15/2026'
      );

      expect(result.success).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toBe('Subscription Canceled - Agent Forge');
      expect(call.html).toContain('Professional');
      expect(call.html).toContain('3/15/2026');
    });

    it('should include what user will lose access to', async () => {
      await sendSubscriptionCanceledEmail(
        'user@example.com', 'Alice', 'Professional', '3/15/2026'
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain("lose access");
    });

    it('should include reactivation link', async () => {
      await sendSubscriptionCanceledEmail(
        'user@example.com', 'Alice', 'Starter', '2/28/2026'
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('/pricing');
      expect(call.html).toContain('Reactivate');
    });

    it('should handle Resend error', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Rate limited' } });
      const result = await sendSubscriptionCanceledEmail(
        'user@example.com', 'Alice', 'Starter', '3/1/2026'
      );
      expect(result.success).toBe(false);
    });
  });

  // ── Usage Alert Email ────────────────────────────────────────────

  describe('sendUsageAlertEmail', () => {
    it('should send usage alert with percentage', async () => {
      const result = await sendUsageAlertEmail(
        'user@example.com', 'Alice', 75, 1000, 750
      );

      expect(result.success).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toContain('75%');
      expect(call.html).toContain('75%');
      expect(call.html).toContain('750');
      expect(call.html).toContain('1,000');
    });

    it('should show warning for 90%+ usage', async () => {
      await sendUsageAlertEmail('user@example.com', 'Alice', 92, 1000, 920);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('Warning');
    });

    it('should include upgrade plan link', async () => {
      await sendUsageAlertEmail('user@example.com', 'Alice', 80, 1000, 800);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('/pricing');
      expect(call.html).toContain('Upgrade');
    });

    it('should handle exception', async () => {
      mockSend.mockRejectedValue(new Error('Timeout'));
      const result = await sendUsageAlertEmail('user@example.com', 'Alice', 90, 1000, 900);
      expect(result.success).toBe(false);
    });
  });

  // ── Weekly Summary Email ─────────────────────────────────────────

  describe('sendWeeklySummaryEmail', () => {
    it('should send weekly summary with stats', async () => {
      const result = await sendWeeklySummaryEmail(
        'user@example.com', 'Alice',
        {
          agentsCreated: 3,
          totalExecutions: 1500,
          successRate: 97,
          topAgent: 'Support Bot',
        }
      );

      expect(result.success).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toBe('Your Agent Forge Weekly Summary');
      expect(call.html).toContain('3');
      expect(call.html).toContain('1,500');
      expect(call.html).toContain('97%');
      expect(call.html).toContain('Support Bot');
    });

    it('should work without topAgent', async () => {
      const result = await sendWeeklySummaryEmail(
        'user@example.com', 'Bob',
        {
          agentsCreated: 0,
          totalExecutions: 0,
          successRate: 0,
        }
      );

      expect(result.success).toBe(true);
      const call = mockSend.mock.calls[0][0];
      expect(call.html).not.toContain('Top Performing Agent');
    });

    it('should include dashboard link', async () => {
      await sendWeeklySummaryEmail('user@example.com', 'Alice', {
        agentsCreated: 1,
        totalExecutions: 100,
        successRate: 95,
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('/dashboard');
    });

    it('should handle Resend error', async () => {
      mockSend.mockRejectedValue(new Error('Server error'));
      const result = await sendWeeklySummaryEmail('user@example.com', 'Alice', {
        agentsCreated: 1,
        totalExecutions: 100,
        successRate: 95,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Template Structure ───────────────────────────────────────────

  describe('email HTML template', () => {
    it('should include proper HTML structure', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('<!DOCTYPE html>');
      expect(call.html).toContain('<html>');
      expect(call.html).toContain('</html>');
    });

    it('should include Agent Forge branding', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('Agent Forge');
    });

    it('should include footer links', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('Dashboard');
      expect(call.html).toContain('Pricing');
      expect(call.html).toContain('Support');
    });

    it('should include responsive meta tags', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice', 'Starter');

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('viewport');
      expect(call.html).toContain('width=device-width');
    });
  });
});
