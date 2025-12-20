# Resend Email Service Setup Guide

This guide walks you through setting up Resend for Agent Forge's email notifications.

## Overview

Agent Forge uses [Resend](https://resend.com) to send transactional emails including:
- Welcome emails for new subscribers
- Payment confirmations
- Payment failure notifications
- Subscription cancellation confirmations
- Usage alerts
- Weekly summary reports

The email service is implemented in `lib/emailService.ts`.

---

## Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click **Sign Up** (or **Get Started**)
3. Create your account using email or GitHub
4. Verify your email address

---

## Step 2: Verify Your Domain

To send emails from your custom domain (e.g., `noreply@agent-forge.app`), you must verify domain ownership.

### 2.1 Add Your Domain

1. In the Resend dashboard, click **Domains** in the left sidebar
2. Click **Add Domain**
3. Enter your domain (e.g., `agent-forge.app`)
4. Click **Add**

### 2.2 Add DNS Records

Resend will provide DNS records to add to your domain registrar. You'll need to add:

**SPF Record (TXT)**
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM Records (TXT)** - Resend provides 3 DKIM records:
```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]

Type: TXT
Name: resend2._domainkey
Value: [provided by Resend]

Type: TXT
Name: resend3._domainkey
Value: [provided by Resend]
```

**DMARC Record (TXT)** - Optional but recommended:
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@agent-forge.app
```

### 2.3 Wait for Verification

- DNS changes can take **5 minutes to 48 hours** to propagate
- Click **Verify Records** in Resend dashboard
- Status will change from "Pending" to "Verified" when complete
- You'll receive an email confirmation

### 2.4 Important Notes

- **Cannot send from unverified domains** - Emails will fail
- Use Resend's test domain (`onboarding@resend.dev`) for initial testing
- For production, always use a verified custom domain

---

## Step 3: Create API Key

1. In Resend dashboard, click **API Keys** in the left sidebar
2. Click **Create API Key**
3. Configure the key:
   - **Name**: `Agent Forge Production` (or `Development`)
   - **Permission**: Select **Full Access** (or **Sending Access** only)
   - **Domain**: Select your verified domain (optional, limits key to specific domain)
4. Click **Create**
5. **CRITICAL**: Copy the API key immediately - it's only shown once
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Production vs Development Keys

**Best Practice**: Create separate API keys for different environments

| Environment | Key Name | Permission | Notes |
|-------------|----------|------------|-------|
| Development | `Agent Forge Dev` | Full Access | Use with `localhost` testing |
| Staging | `Agent Forge Staging` | Sending Access | Limit to staging domain |
| Production | `Agent Forge Production` | Sending Access | Limit to production domain |

---

## Step 4: Configure Environment Variables

Add the following to your `.env` or `.env.local` file:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email sender address (must match verified domain)
EMAIL_FROM="Agent Forge <noreply@agent-forge.app>"
```

### Environment Variable Details

**`RESEND_API_KEY`** (Required)
- Your Resend API key from Step 3
- Must start with `re_`
- Keep this secret - never commit to version control

**`EMAIL_FROM`** (Optional, defaults to `noreply@agent-forge.app`)
- Format: `"Display Name <email@domain.com>"` or `email@domain.com`
- Email address **must be from a verified domain**
- Display name appears as sender name in email clients

### Example Configurations

**Development (using Resend test domain)**
```bash
RESEND_API_KEY=re_dev_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Agent Forge Dev <onboarding@resend.dev>"
```

**Production (using custom domain)**
```bash
RESEND_API_KEY=re_prod_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Agent Forge <noreply@agent-forge.app>"
```

---

## Step 5: Update .gitignore

Ensure your `.env` files are not committed to version control:

```bash
# .gitignore
.env
.env.local
.env.production
.env.development
```

---

## Step 6: Test Email Sending

Create a test script to verify email functionality.

### Option A: Quick Test via API Route

1. Start your development server:
```bash
npm run dev
```

2. Create a test API endpoint at `app/api/test-email/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/emailService';

export async function GET() {
  try {
    const result = await sendWelcomeEmail(
      'your-email@example.com', // Replace with your email
      'Test User',
      'Professional'
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
```

3. Visit `http://localhost:3000/api/test-email` in your browser
4. Check your inbox for the welcome email

### Option B: Test Script

Create `scripts/test-resend.ts`:

```typescript
import { sendWelcomeEmail } from '../lib/emailService';

async function testEmail() {
  console.log('Testing Resend email service...');

  const result = await sendWelcomeEmail(
    'your-email@example.com', // Replace with your email
    'Test User',
    'Professional'
  );

  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('Email ID:', result.data?.id);
  } else {
    console.error('❌ Email failed:', result.error);
  }
}

testEmail();
```

Run with:
```bash
npx tsx scripts/test-resend.ts
```

### Option C: Test in Resend Dashboard

1. Go to **Logs** in Resend dashboard
2. Click **Send Test Email**
3. Enter recipient email
4. Select template or compose test message
5. Click **Send**

---

## Step 7: Monitor Email Delivery

### Resend Dashboard

1. **Logs**: View all sent emails, delivery status, and errors
2. **Analytics**: Track open rates, click rates, bounce rates
3. **Webhooks**: Set up webhooks for delivery events (optional)

### Email Status Types

| Status | Description |
|--------|-------------|
| `sent` | Email accepted by Resend |
| `delivered` | Email delivered to recipient's mail server |
| `delivery_delayed` | Temporary delay, will retry |
| `bounced` | Permanent failure (invalid email) |
| `complained` | Recipient marked as spam |

### Common Issues

**Error: "Domain not verified"**
- Solution: Wait for DNS propagation, verify records in Resend dashboard

**Error: "Invalid API key"**
- Solution: Check `RESEND_API_KEY` in `.env`, ensure it starts with `re_`

**Error: "Email address not allowed"**
- Solution: `EMAIL_FROM` must be from a verified domain

**Emails going to spam**
- Solution: Add DMARC record, ensure SPF/DKIM are verified, warm up domain

---

## Available Email Functions

The `lib/emailService.ts` module exports the following functions:

### `sendWelcomeEmail(email, name, plan)`
Sent when a user subscribes to a paid plan.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): User's name
- `plan` (string): Subscription plan name (e.g., "Professional")

### `sendPaymentSuccessEmail(email, name, amount, plan, invoiceUrl?)`
Sent when a payment is successfully processed.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): User's name
- `amount` (number): Payment amount in cents (e.g., 2900 for $29.00)
- `plan` (string): Subscription plan name
- `invoiceUrl` (string, optional): Link to Stripe invoice

### `sendPaymentFailedEmail(email, name, amount, plan, retryDate?)`
Sent when a payment fails.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): User's name
- `amount` (number): Failed payment amount in cents
- `plan` (string): Subscription plan name
- `retryDate` (string, optional): Next retry date (formatted)

### `sendSubscriptionCanceledEmail(email, name, plan, endDate)`
Sent when a user cancels their subscription.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): User's name
- `plan` (string): Canceled plan name
- `endDate` (string): Date when access ends (formatted)

### `sendUsageAlertEmail(email, name, usagePercent, limit, current)`
Sent when usage reaches 80% or 90% of limit.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): User's name
- `usagePercent` (number): Percentage of limit used (e.g., 85)
- `limit` (number): Total monthly limit
- `current` (number): Current usage count

### `sendWeeklySummaryEmail(email, name, stats)`
Sent weekly with user activity summary.

**Parameters:**
- `email` (string): Recipient email address
- `name` (string): User's name
- `stats` (object):
  - `agentsCreated` (number): Number of agents created this week
  - `totalExecutions` (number): Total agent executions
  - `successRate` (number): Percentage of successful executions
  - `topAgent` (string, optional): Name of most-used agent

---

## Production Checklist

Before going live, verify:

- [ ] Custom domain verified in Resend
- [ ] SPF, DKIM, and DMARC DNS records added
- [ ] Production API key created with limited permissions
- [ ] `RESEND_API_KEY` set in production environment
- [ ] `EMAIL_FROM` uses verified production domain
- [ ] `.env` files excluded from version control
- [ ] Test email sent and received successfully
- [ ] Email logs monitored in Resend dashboard
- [ ] Unsubscribe links functional (if applicable)
- [ ] Support email address monitored (`support@agent-forge.app`)

---

## Additional Resources

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend API Reference**: [https://resend.com/docs/api-reference](https://resend.com/docs/api-reference)
- **Resend Node.js SDK**: [https://github.com/resendlabs/resend-node](https://github.com/resendlabs/resend-node)
- **Email Templates**: [https://resend.com/emails](https://resend.com/emails)
- **Status Page**: [https://status.resend.com](https://status.resend.com)

---

## Support

**Resend Support:**
- Email: [support@resend.com](mailto:support@resend.com)
- Discord: [https://discord.gg/resend](https://discord.gg/resend)
- Documentation: [https://resend.com/docs](https://resend.com/docs)

**Agent Forge:**
- Email: [support@agent-forge.app](mailto:support@agent-forge.app)
- Review `lib/emailService.ts` for implementation details
