import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = 'https://agent-forge.app';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Agent Forge <noreply@agent-forge.app>';

// Brand colors
const BRAND_GRADIENT = 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)';
const PRIMARY_COLOR = '#8B5CF6';
const SECONDARY_COLOR = '#EC4899';

// Email template wrapper
const emailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Forge</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: ${BRAND_GRADIENT};
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      background: ${BRAND_GRADIENT};
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: ${PRIMARY_COLOR};
      text-decoration: none;
    }
    h2 {
      color: #1f2937;
      font-size: 22px;
      margin-top: 0;
    }
    p {
      margin: 16px 0;
      color: #4b5563;
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid ${PRIMARY_COLOR};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>Agent Forge - Build AI Agents Without Code</p>
      <p>
        <a href="${APP_URL}">Dashboard</a> |
        <a href="${APP_URL}/pricing">Pricing</a> |
        <a href="${APP_URL}/support">Support</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px;">
        If you have questions, reply to this email or contact us at support@agent-forge.app
      </p>
    </div>
  </div>
</body>
</html>
`;

// Welcome email for new subscribers
export async function sendWelcomeEmail(email: string, name: string, plan: string) {
  const content = `
    <div class="header">
      <h1>Welcome to Agent Forge! 🎉</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Welcome aboard! We're thrilled to have you as a ${plan} subscriber.</p>

      <p>You now have access to powerful tools to build AI agents without code. Here's what you can do next:</p>

      <div class="info-box">
        <strong>Getting Started:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Create your first AI agent in minutes</li>
          <li>Explore pre-built templates and workflows</li>
          <li>Connect to your favorite tools and APIs</li>
          <li>Deploy agents to production with one click</li>
        </ul>
      </div>

      <center>
        <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
      </center>

      <p>If you need any help getting started, our documentation and support team are here for you.</p>

      <p>Best regards,<br>The Agent Forge Team</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to Agent Forge!',
      html: emailTemplate(content),
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
}

// Payment success email
export async function sendPaymentSuccessEmail(
  email: string,
  name: string,
  amount: number,
  plan: string,
  invoiceUrl?: string
) {
  const formattedAmount = (amount / 100).toFixed(2);
  const content = `
    <div class="header">
      <h1>Payment Successful ✓</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Your payment has been processed successfully. Thank you for your continued subscription!</p>

      <div class="info-box">
        <strong>Payment Details:</strong><br>
        Amount: $${formattedAmount} USD<br>
        Plan: ${plan}<br>
        Status: Paid
      </div>

      ${invoiceUrl ? `<center><a href="${invoiceUrl}" class="button">View Invoice</a></center>` : ''}

      <p>Your subscription is active and you have full access to all ${plan} features.</p>

      <p>Best regards,<br>The Agent Forge Team</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Payment Received - Agent Forge',
      html: emailTemplate(content),
    });

    if (error) {
      console.error('Error sending payment success email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending payment success email:', error);
    return { success: false, error };
  }
}

// Payment failed email
export async function sendPaymentFailedEmail(
  email: string,
  name: string,
  amount: number,
  plan: string,
  retryDate?: string
) {
  const formattedAmount = (amount / 100).toFixed(2);
  const content = `
    <div class="header">
      <h1>Payment Failed</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>We were unable to process your recent payment for your Agent Forge subscription.</p>

      <div class="info-box">
        <strong>Payment Details:</strong><br>
        Amount: $${formattedAmount} USD<br>
        Plan: ${plan}<br>
        Status: Failed
      </div>

      <p>This could be due to insufficient funds, an expired card, or your bank declining the transaction.</p>

      <p><strong>What happens next?</strong></p>
      <ul>
        <li>We'll automatically retry the payment ${retryDate ? `on ${retryDate}` : 'in a few days'}</li>
        <li>You can update your payment method to avoid service interruption</li>
        <li>Your access remains active during the retry period</li>
      </ul>

      <center>
        <a href="${APP_URL}/billing" class="button">Update Payment Method</a>
      </center>

      <p>If you have questions or need assistance, please don't hesitate to contact us.</p>

      <p>Best regards,<br>The Agent Forge Team</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Payment Failed - Action Required',
      html: emailTemplate(content),
    });

    if (error) {
      console.error('Error sending payment failed email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    return { success: false, error };
  }
}

// Subscription canceled email
export async function sendSubscriptionCanceledEmail(
  email: string,
  name: string,
  plan: string,
  endDate: string
) {
  const content = `
    <div class="header">
      <h1>Subscription Canceled</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>We're sorry to see you go. Your ${plan} subscription has been canceled.</p>

      <div class="info-box">
        <strong>Important Information:</strong><br>
        Your access will continue until: ${endDate}<br>
        After this date, your account will be downgraded to the free plan.
      </div>

      <p><strong>What you'll lose access to:</strong></p>
      <ul>
        <li>Premium AI agent templates</li>
        <li>Advanced workflow automation</li>
        <li>Priority support</li>
        <li>Higher usage limits</li>
      </ul>

      <p>Changed your mind? You can reactivate your subscription anytime before ${endDate}.</p>

      <center>
        <a href="${APP_URL}/pricing" class="button">Reactivate Subscription</a>
      </center>

      <p>We'd love to hear your feedback about why you're leaving. Your insights help us improve Agent Forge for everyone.</p>

      <p>Thank you for being part of Agent Forge. We hope to see you again soon!</p>

      <p>Best regards,<br>The Agent Forge Team</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Subscription Canceled - Agent Forge',
      html: emailTemplate(content),
    });

    if (error) {
      console.error('Error sending subscription canceled email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending subscription canceled email:', error);
    return { success: false, error };
  }
}

// Usage alert email
export async function sendUsageAlertEmail(
  email: string,
  name: string,
  usagePercent: number,
  limit: number,
  current: number
) {
  const content = `
    <div class="header">
      <h1>Usage Alert</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>You've used ${usagePercent}% of your monthly allocation.</p>

      <div class="info-box">
        <strong>Current Usage:</strong><br>
        ${current.toLocaleString()} / ${limit.toLocaleString()} agent executions<br>
        ${usagePercent}% of limit reached
      </div>

      ${usagePercent >= 90 ? `
        <p style="color: #dc2626;"><strong>⚠️ Warning:</strong> You're approaching your limit. Once reached, your agents will be paused until next billing cycle or you can upgrade your plan.</p>
      ` : `
        <p>You're on track to reach your limit soon. Consider upgrading if you need more capacity.</p>
      `}

      <center>
        <a href="${APP_URL}/pricing" class="button">Upgrade Plan</a>
      </center>

      <p>Best regards,<br>The Agent Forge Team</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Usage Alert: ${usagePercent}% of Monthly Limit Reached`,
      html: emailTemplate(content),
    });

    if (error) {
      console.error('Error sending usage alert email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending usage alert email:', error);
    return { success: false, error };
  }
}

// Weekly summary email
export async function sendWeeklySummaryEmail(
  email: string,
  name: string,
  stats: {
    agentsCreated: number;
    totalExecutions: number;
    successRate: number;
    topAgent?: string;
  }
) {
  const content = `
    <div class="header">
      <h1>Your Weekly Summary</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>Here's what you accomplished this week with Agent Forge:</p>

      <div class="info-box">
        <strong>📊 Your Stats:</strong><br><br>
        <strong>Agents Created:</strong> ${stats.agentsCreated}<br>
        <strong>Total Executions:</strong> ${stats.totalExecutions.toLocaleString()}<br>
        <strong>Success Rate:</strong> ${stats.successRate}%<br>
        ${stats.topAgent ? `<strong>Top Performing Agent:</strong> ${stats.topAgent}<br>` : ''}
      </div>

      <p><strong>💡 Tips for this week:</strong></p>
      <ul>
        <li>Try creating a multi-step workflow to automate complex tasks</li>
        <li>Explore our new template library for inspiration</li>
        <li>Connect your agents to more tools for enhanced functionality</li>
      </ul>

      <center>
        <a href="${APP_URL}/dashboard" class="button">View Full Dashboard</a>
      </center>

      <p>Keep building amazing things!</p>

      <p>Best regards,<br>The Agent Forge Team</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your Agent Forge Weekly Summary',
      html: emailTemplate(content),
    });

    if (error) {
      console.error('Error sending weekly summary email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending weekly summary email:', error);
    return { success: false, error };
  }
}
