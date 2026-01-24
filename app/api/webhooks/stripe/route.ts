import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/emailService';
import { logger } from '@/lib/logger';
import { shouldProcessEventAsync } from '@/lib/idempotency';

// Validate env vars at runtime instead of using non-null assertions
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    logger.error('STRIPE_SECRET_KEY not configured');
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

// Helper to get customer details
async function getCustomerDetails(
  stripe: Stripe,
  customerId: string
): Promise<{ email: string; name: string } | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    // Ensure email exists before proceeding
    if (!customer.email) {
      logger.warn('Customer has no email', { customerId });
      return null;
    }
    return {
      email: customer.email,
      name: customer.name || 'there',
    };
  } catch (error) {
    logger.error('Error fetching customer', error, { customerId });
    return null;
  }
}

// Helper to format plan name
function formatPlanName(plan: string): string {
  const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  return planNames[plan.toLowerCase()] || plan;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    logger.warn('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.error('Webhook signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency check using Redis when available
  const shouldProcess = await shouldProcessEventAsync(event.id);
  if (!shouldProcess) {
    logger.info('Duplicate event skipped', { eventId: event.id, eventType: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerDetails = await getCustomerDetails(stripe, session.customer as string);
        if (!customerDetails) {
          // Return 500 so Stripe retries - this is a transient failure
          logger.error('Could not retrieve customer details for checkout', undefined, { eventId: event.id });
          return NextResponse.json({ error: 'Customer retrieval failed' }, { status: 500 });
        }

        const plan = session.metadata?.plan || 'unknown';
        const formattedPlan = formatPlanName(plan);

        await sendWelcomeEmail(customerDetails.email, customerDetails.name, formattedPlan);
        logger.info('Welcome email sent', { email: customerDetails.email, plan: formattedPlan, eventId: event.id });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerDetails = await getCustomerDetails(stripe, invoice.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details for invoice.paid', undefined, { eventId: event.id });
          return NextResponse.json({ error: 'Customer retrieval failed' }, { status: 500 });
        }

        let plan = 'Subscription';
        // Use 'in' check for subscription property (API version compatibility)
        const subscriptionId = 'subscription' in invoice ? invoice.subscription : null;
        if (subscriptionId && typeof subscriptionId === 'string') {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            plan = formatPlanName(subscription.metadata?.plan || 'subscription');
          } catch (error) {
            logger.error('Error fetching subscription', error, { subscriptionId });
            // Continue with default plan name, this is non-critical
          }
        }

        await sendPaymentSuccessEmail(
          customerDetails.email,
          customerDetails.name,
          invoice.amount_paid,
          plan,
          invoice.hosted_invoice_url || undefined
        );
        logger.info('Payment success email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerDetails = await getCustomerDetails(stripe, invoice.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details for payment_failed', undefined, { eventId: event.id });
          return NextResponse.json({ error: 'Customer retrieval failed' }, { status: 500 });
        }

        let plan = 'Subscription';
        let retryDate: string | undefined;

        // Use 'in' check for subscription property (API version compatibility)
        const failedSubId = 'subscription' in invoice ? invoice.subscription : null;
        if (failedSubId && typeof failedSubId === 'string') {
          try {
            const subscription = await stripe.subscriptions.retrieve(failedSubId);
            plan = formatPlanName(subscription.metadata?.plan || 'subscription');
            if (invoice.next_payment_attempt) {
              retryDate = new Date(invoice.next_payment_attempt * 1000).toLocaleDateString();
            }
          } catch (error) {
            logger.error('Error fetching subscription', error, { subscriptionId: failedSubId });
          }
        }

        await sendPaymentFailedEmail(customerDetails.email, customerDetails.name, invoice.amount_due, plan, retryDate);
        logger.info('Payment failed email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerDetails = await getCustomerDetails(stripe, subscription.customer as string);
        if (!customerDetails) {
          logger.error('Could not retrieve customer details for subscription.deleted', undefined, { eventId: event.id });
          return NextResponse.json({ error: 'Customer retrieval failed' }, { status: 500 });
        }

        const plan = formatPlanName(subscription.metadata?.plan || 'subscription');
        const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();

        await sendSubscriptionCanceledEmail(customerDetails.email, customerDetails.name, plan, endDate);
        logger.info('Subscription canceled email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info('New subscription created', { subscriptionId: subscription.id, eventId: event.id });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info('Subscription updated', { subscriptionId: subscription.id, eventId: event.id });
        break;
      }

      default:
        logger.debug('Unhandled event type', { eventType: event.type, eventId: event.id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error, { eventId: event.id });
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
