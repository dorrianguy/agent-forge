import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/emailService';
import { logger } from '@/lib/logger';
import { shouldProcessEventAsync } from '@/lib/idempotency';

type DbPlan = 'free' | 'starter' | 'professional' | 'enterprise';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    logger.error('Supabase admin credentials not configured — DB sync skipped');
    return null;
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

function normalizePlan(plan: string | null | undefined): DbPlan | null {
  if (!plan) return null;
  const p = plan.toLowerCase();
  if (p === 'free' || p === 'starter' || p === 'professional' || p === 'enterprise') {
    return p;
  }
  return null;
}

function periodDate(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000).toISOString();
}

async function syncCheckoutCompleted(
  db: SupabaseClient,
  session: Stripe.Checkout.Session,
  customerId: string,
): Promise<void> {
  const userId = session.metadata?.userId;
  const plan = normalizePlan(session.metadata?.plan);
  if (!userId || !plan) {
    logger.warn('checkout.session.completed missing userId or plan in metadata', {
      sessionId: session.id,
    });
    return;
  }

  const { error: profileErr } = await db
    .from('profiles')
    .update({ plan, stripe_customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileErr) {
    logger.error('Failed to update profiles.plan after checkout', profileErr, { userId });
  }
}

async function syncSubscription(
  db: SupabaseClient,
  subscription: Stripe.Subscription,
  status: SubscriptionStatus,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const plan = normalizePlan(subscription.metadata?.plan);
  if (!userId) {
    logger.warn('Subscription missing userId in metadata', { subscriptionId: subscription.id });
    return;
  }

  const periodStart = periodDate((subscription as unknown as { current_period_start?: number }).current_period_start);
  const periodEnd = periodDate((subscription as unknown as { current_period_end?: number }).current_period_end);

  const { error: subErr } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      plan: plan ?? 'starter',
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (subErr) {
    logger.error('Failed to upsert subscriptions row', subErr, {
      userId,
      subscriptionId: subscription.id,
    });
  }

  // Profile plan reflects the active subscription. On cancel/past_due we keep the
  // user on their paid plan until period end; on delete we downgrade to free.
  if (plan && (status === 'active' || status === 'trialing')) {
    const { error: profileErr } = await db
      .from('profiles')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (profileErr) {
      logger.error('Failed to update profiles.plan from subscription', profileErr, { userId });
    }
  }
}

async function syncSubscriptionDeleted(
  db: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    logger.warn('subscription.deleted missing userId in metadata', { subscriptionId: subscription.id });
    return;
  }

  const { error: subErr } = await db
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);
  if (subErr) {
    logger.error('Failed to mark subscription canceled', subErr, { subscriptionId: subscription.id });
  }

  const { error: profileErr } = await db
    .from('profiles')
    .update({ plan: 'free', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileErr) {
    logger.error('Failed to downgrade profiles.plan to free', profileErr, { userId });
  }
}

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

        const db = getAdminClient();
        if (db) {
          await syncCheckoutCompleted(db, session, session.customer as string);
        }

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
        // Use 'in' check for current_period_end (API version compatibility)
        const periodEnd = 'current_period_end' in subscription ? (subscription.current_period_end as number) : Date.now() / 1000;
        const endDate = new Date(periodEnd * 1000).toLocaleDateString();

        const db = getAdminClient();
        if (db) {
          await syncSubscriptionDeleted(db, subscription);
        }

        await sendSubscriptionCanceledEmail(customerDetails.email, customerDetails.name, plan, endDate);
        logger.info('Subscription canceled email sent', { email: customerDetails.email, eventId: event.id });
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const db = getAdminClient();
        if (db) {
          await syncSubscription(db, subscription, 'active');
        }
        logger.info('New subscription created', { subscriptionId: subscription.id, eventId: event.id });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const db = getAdminClient();
        if (db) {
          const status: SubscriptionStatus =
            subscription.status === 'past_due'
              ? 'past_due'
              : subscription.status === 'canceled'
                ? 'canceled'
                : subscription.status === 'trialing'
                  ? 'trialing'
                  : 'active';
          await syncSubscription(db, subscription, status);
        }
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
