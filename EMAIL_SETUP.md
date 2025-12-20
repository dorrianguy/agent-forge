# Email Notifications Setup Guide

This guide explains how to set up and test email notifications for Agent Forge using Resend.

## Files Created

1. **lib/emailService.ts** - Email service with 6 email templates
2. **app/api/webhooks/stripe/route.ts** - Stripe webhook handler that triggers emails
3. **.env** - Updated with Resend configuration variables

## Email Templates Available

### 1. Welcome Email
- Triggered on: `checkout.session.completed`
- Sent to: New subscribers
- Content: Welcome message with quick start guide

### 2. Payment Success Email
- Triggered on: `invoice.paid`
- Sent to: Customers after successful payment
- Content: Payment confirmation with invoice link

### 3. Payment Failed Email
- Triggered on: `invoice.payment_failed`
- Sent to: Customers when payment fails
- Content: Payment failure notice with retry information

### 4. Subscription Canceled Email
- Triggered on: `customer.subscription.deleted`
- Sent to: Customers who cancel subscription
- Content: Cancellation confirmation with access end date

### 5. Usage Alert Email
- Manual trigger (for usage monitoring)
- Sent to: Customers approaching usage limits
- Content: Usage statistics and upgrade prompt

### 6. Weekly Summary Email
- Manual trigger (for weekly reports)
- Sent to: Active customers
- Content: Weekly stats and tips

## Setup Instructions

### Step 1: Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

### Step 2: Configure Environment Variables

Update your `.env` file with:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_actual_key_here
EMAIL_FROM=Agent Forge <noreply@agent-forge.app>
```

**Important:** Replace `re_XXXXXXXXX` with your actual Resend API key.

### Step 3: Verify Domain (Production)

For production use, you need to verify your sending domain:

1. In Resend dashboard, go to Domains
2. Add your domain (agent-forge.app)
3. Add the DNS records provided by Resend to your domain
4. Wait for verification (usually takes a few minutes)
5. Update `EMAIL_FROM` to use your verified domain

### Step 4: Configure Stripe Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://agent-forge.app/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

## Testing

### Test Webhook Locally

1. Install Stripe CLI:
   ```bash
   stripe login
   ```

2. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Trigger test events:
   ```bash
   # Test welcome email
   stripe trigger checkout.session.completed

   # Test payment success
   stripe trigger invoice.paid

   # Test payment failed
   stripe trigger invoice.payment_failed

   # Test subscription canceled
   stripe trigger customer.subscription.deleted
   ```

### Test Email Service Directly

Create a test endpoint in `app/api/test-email/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/emailService';

export async function GET() {
  const result = await sendWelcomeEmail(
    'your-email@example.com',
    'Test User',
    'Professional'
  );
  return NextResponse.json(result);
}
```

Then visit: `http://localhost:3000/api/test-email`

## Email Customization

### Brand Colors
The emails use Agent Forge's brand colors:
- Purple: `#8B5CF6`
- Pink: `#EC4899`
- Gradient: `linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)`

### Modify Templates
To customize email content, edit the functions in `lib/emailService.ts`.

Each function follows this structure:
```typescript
const content = `
  <div class="header">
    <h1>Email Title</h1>
  </div>
  <div class="content">
    <h2>Hi ${name},</h2>
    <p>Your message here</p>
    <center>
      <a href="${APP_URL}/path" class="button">Call to Action</a>
    </center>
  </div>
`;

await resend.emails.send({
  from: EMAIL_FROM,
  to: email,
  subject: 'Email Subject',
  html: emailTemplate(content),
});
```

## Usage Monitoring

To implement usage alerts, add this to your usage tracking code:

```typescript
import { sendUsageAlertEmail } from '@/lib/emailService';

// Check usage and send alert
const usagePercent = (currentUsage / limit) * 100;

if (usagePercent >= 80) {
  await sendUsageAlertEmail(
    user.email,
    user.name,
    usagePercent,
    limit,
    currentUsage
  );
}
```

## Weekly Summaries

To implement weekly summaries, create a cron job or scheduled task:

```typescript
import { sendWeeklySummaryEmail } from '@/lib/emailService';

// Get user stats for the week
const stats = {
  agentsCreated: 5,
  totalExecutions: 1234,
  successRate: 98.5,
  topAgent: 'Customer Support Bot'
};

await sendWeeklySummaryEmail(
  user.email,
  user.name,
  stats
);
```

## Troubleshooting

### Emails Not Sending

1. Check RESEND_API_KEY is set correctly
2. Verify API key is active in Resend dashboard
3. Check server logs for error messages
4. Ensure email addresses are valid

### Webhook Not Triggering

1. Verify STRIPE_WEBHOOK_SECRET is correct
2. Check webhook endpoint URL in Stripe dashboard
3. Ensure webhook events are selected
4. Test with Stripe CLI locally

### Domain Verification Issues

1. Check DNS records are added correctly
2. Allow 24-48 hours for DNS propagation
3. Use Resend's DNS checker tool
4. Contact Resend support if issues persist

## Production Checklist

- [ ] Resend API key configured
- [ ] Domain verified in Resend
- [ ] EMAIL_FROM uses verified domain
- [ ] Stripe webhook created and configured
- [ ] STRIPE_WEBHOOK_SECRET set
- [ ] Test all email types
- [ ] Monitor email delivery in Resend dashboard
- [ ] Set up email analytics/tracking (optional)

## Support

For issues or questions:
- Resend Docs: [https://resend.com/docs](https://resend.com/docs)
- Stripe Webhook Docs: [https://stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
