# Stripe Webhook Setup Guide

This guide walks you through setting up Stripe webhooks for handling subscription and payment events in your application.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Your application deployed with a public URL
- Access to your application's environment variables

## Step-by-Step Setup

### 1. Access Stripe Webhooks Dashboard

Navigate to the Stripe webhooks page:
```
https://dashboard.stripe.com/webhooks
```

Make sure you're in the correct mode (Test or Live) depending on your environment.

### 2. Add New Endpoint

1. Click the **"Add endpoint"** button in the top right
2. You'll be prompted to configure the webhook endpoint

### 3. Configure Endpoint URL

Enter your webhook endpoint URL:
```
https://your-domain.com/api/webhooks/stripe
```

Replace `your-domain.com` with your actual domain.

**Examples:**
- Production: `https://app.yourdomain.com/api/webhooks/stripe`
- Staging: `https://staging.yourdomain.com/api/webhooks/stripe`

### 4. Select Events to Listen For

Click **"Select events"** and add the following events:

#### Subscription Events
- `checkout.session.completed` - When a checkout session is successfully completed
- `customer.subscription.created` - When a new subscription is created
- `customer.subscription.updated` - When a subscription is modified (plan change, etc.)
- `customer.subscription.deleted` - When a subscription is cancelled

#### Payment Events
- `invoice.paid` - When an invoice payment succeeds
- `invoice.payment_failed` - When an invoice payment fails

### 5. Save the Endpoint

Click **"Add endpoint"** to save your configuration.

### 6. Copy the Webhook Signing Secret

After creating the endpoint:

1. Click on the newly created endpoint in the webhooks list
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the signing secret (starts with `whsec_`)

### 7. Add to Environment Variables

Add the webhook signing secret to your `.env` or `.env.local` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

**Important:**
- Test mode and Live mode have different webhook secrets
- Never commit this secret to version control
- Add `.env` and `.env.local` to your `.gitignore`

### 8. Deploy and Verify

1. Deploy your application with the new environment variable
2. Trigger a test event in Stripe (e.g., create a test subscription)
3. Check the webhook logs in the Stripe Dashboard to verify events are being received

## Testing with Stripe CLI

For local development, use the Stripe CLI to forward webhook events to your local server.

### Install Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows (Scoop):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authorize the CLI.

### Forward Events to Local Server

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

Copy this secret and add it to your local `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Trigger Test Events

In a new terminal, trigger test events:

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test invoice payment
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed
```

### Monitor Events

The `stripe listen` terminal will show all events as they're forwarded to your application.

## Webhook Event Structure

Your webhook handler will receive events in this format:

```typescript
{
  id: "evt_xxxxxxxxxxxxx",
  object: "event",
  type: "customer.subscription.created",
  data: {
    object: {
      // The subscription, invoice, or checkout session object
    }
  }
}
```

## Verifying Webhook Signatures

Always verify webhook signatures to ensure events are from Stripe:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful checkout
        break;
      case 'customer.subscription.created':
        // Handle new subscription
        break;
      // ... other event types
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Webhook Error', { status: 400 });
  }
}
```

## Common Issues

### Webhook Returns 401/403
- Verify your endpoint URL is publicly accessible
- Check that authentication middleware isn't blocking the webhook route

### Signature Verification Fails
- Ensure you're using the raw request body, not parsed JSON
- Verify the webhook secret matches your environment (test vs live)
- Check that the secret hasn't expired or been rotated

### Events Not Received
- Confirm the endpoint URL is correct and accessible
- Check Stripe Dashboard > Webhooks > [Your Endpoint] > Events log
- Verify your server isn't blocking Stripe's IP addresses

### Local Testing Not Working
- Ensure `stripe listen` is running
- Verify the forwarding URL matches your local server
- Check that your local `.env.local` has the CLI webhook secret

## Security Best Practices

1. **Always verify signatures** - Never process unverified webhook events
2. **Use HTTPS** - Stripe requires HTTPS for production webhooks
3. **Keep secrets secure** - Never expose webhook secrets in client code
4. **Handle idempotency** - Events may be delivered multiple times
5. **Return quickly** - Respond to webhooks within 5 seconds, process async if needed
6. **Monitor failures** - Set up alerts for failed webhook deliveries

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Event Types](https://stripe.com/docs/api/events/types)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

## Support

If you encounter issues:
1. Check the webhook event logs in Stripe Dashboard
2. Review your application logs for error messages
3. Test with the Stripe CLI locally
4. Contact Stripe Support or consult their documentation
