/**
 * Agent Forge — Stripe → Supabase plan backfill
 *
 * One-shot reconciliation for users who paid before the webhook started writing
 * to the `profiles` and `subscriptions` tables. Lists active Stripe subscriptions,
 * resolves the corresponding Supabase user (by metadata.userId or customer email),
 * and writes their plan + customer/subscription IDs to the database.
 *
 * Idempotent: safe to run multiple times. Use --dry-run to preview.
 *
 * Usage:
 *   node scripts/backfill-stripe-plans.js --dry-run
 *   node scripts/backfill-stripe-plans.js
 *
 * Requires in .env:
 *   STRIPE_SECRET_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\nMissing required env vars. Need:');
  console.error('  STRIPE_SECRET_KEY');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const STRIPE_PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_STARTER]: 'starter',
  [process.env.STRIPE_PRICE_PROFESSIONAL]: 'professional',
  [process.env.STRIPE_PRICE_ENTERPRISE]: 'enterprise',
};

const VALID_PLANS = new Set(['free', 'starter', 'professional', 'enterprise']);
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

const stripe = new Stripe(STRIPE_SECRET_KEY);
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizePlan(value) {
  if (!value) return null;
  const p = String(value).toLowerCase();
  return VALID_PLANS.has(p) ? p : null;
}

function planFromPriceIds(subscription) {
  const items = subscription.items?.data ?? [];
  for (const item of items) {
    const priceId = item.price?.id;
    if (priceId && STRIPE_PRICE_TO_PLAN[priceId]) {
      return STRIPE_PRICE_TO_PLAN[priceId];
    }
  }
  return null;
}

async function resolveUserId(subscription, customer) {
  const metaUserId = subscription.metadata?.userId;
  if (metaUserId) return metaUserId;

  const email = customer?.email;
  if (!email) return null;

  // Fall back to email lookup. listUsers is paginated; bounded by page size for now.
  let page = 1;
  while (page <= 50) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.warn(`  email lookup failed: ${error.message}`);
      return null;
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

function periodIso(value) {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000).toISOString();
}

async function processSubscription(subscription) {
  if (!ACTIVE_STATUSES.has(subscription.status)) {
    return { skipped: 'inactive', subscriptionId: subscription.id };
  }

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) {
    return { skipped: 'no-customer', subscriptionId: subscription.id };
  }

  let customer;
  try {
    customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { skipped: 'customer-deleted', subscriptionId: subscription.id };
    }
  } catch (err) {
    return { skipped: 'customer-fetch-failed', subscriptionId: subscription.id, err: err.message };
  }

  const userId = await resolveUserId(subscription, customer);
  if (!userId) {
    return { skipped: 'no-user-match', subscriptionId: subscription.id, email: customer.email };
  }

  const plan =
    normalizePlan(subscription.metadata?.plan) ??
    planFromPriceIds(subscription) ??
    null;
  if (!plan) {
    return { skipped: 'plan-unknown', subscriptionId: subscription.id, userId };
  }

  const status = subscription.status === 'past_due' ? 'past_due'
    : subscription.status === 'trialing' ? 'trialing'
    : 'active';

  const periodStart = periodIso(subscription.current_period_start);
  const periodEnd = periodIso(subscription.current_period_end);

  if (DRY_RUN) {
    return {
      action: 'would-write',
      subscriptionId: subscription.id,
      userId,
      plan,
      status,
      customerId,
      email: customer.email,
    };
  }

  const nowIso = new Date().toISOString();

  const { error: profileErr } = await db
    .from('profiles')
    .update({ plan, stripe_customer_id: customerId, updated_at: nowIso })
    .eq('id', userId);
  if (profileErr) {
    return { error: 'profile-update', subscriptionId: subscription.id, userId, message: profileErr.message };
  }

  const { error: subErr } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      plan,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: nowIso,
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (subErr) {
    return { error: 'subscription-upsert', subscriptionId: subscription.id, userId, message: subErr.message };
  }

  return { action: 'wrote', subscriptionId: subscription.id, userId, plan, status, email: customer.email };
}

async function main() {
  console.log(`\nAgent Forge — Stripe→Supabase backfill ${DRY_RUN ? '(DRY RUN)' : '(LIVE WRITE)'}\n`);

  const summary = { wrote: 0, wouldWrite: 0, skipped: 0, errored: 0 };
  const errors = [];
  const skipped = [];

  let cursor;
  let processed = 0;

  while (true) {
    const page = await stripe.subscriptions.list({
      limit: 100,
      status: 'all',
      ...(cursor ? { starting_after: cursor } : {}),
      expand: ['data.items.data.price'],
    });

    for (const subscription of page.data) {
      processed += 1;
      const result = await processSubscription(subscription);

      if (result.action === 'wrote') {
        summary.wrote += 1;
        console.log(`  ✓ ${result.email} → ${result.plan} (${result.status})`);
      } else if (result.action === 'would-write') {
        summary.wouldWrite += 1;
        console.log(`  · ${result.email} → ${result.plan} (${result.status})`);
      } else if (result.error) {
        summary.errored += 1;
        errors.push(result);
        console.warn(`  ! ${result.subscriptionId}: ${result.error} — ${result.message}`);
      } else {
        summary.skipped += 1;
        skipped.push(result);
      }
    }

    if (!page.has_more) break;
    cursor = page.data[page.data.length - 1].id;
  }

  console.log(`\nProcessed ${processed} subscriptions:`);
  console.log(`  wrote:        ${summary.wrote}`);
  console.log(`  would-write:  ${summary.wouldWrite}`);
  console.log(`  skipped:      ${summary.skipped}`);
  console.log(`  errored:      ${summary.errored}`);

  if (skipped.length) {
    const reasons = skipped.reduce((acc, s) => {
      acc[s.skipped] = (acc[s.skipped] || 0) + 1;
      return acc;
    }, {});
    console.log('\nSkip reasons:');
    for (const [reason, count] of Object.entries(reasons)) {
      console.log(`  ${reason}: ${count}`);
    }
  }

  if (errors.length) {
    console.log('\nErrors above need manual review.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
