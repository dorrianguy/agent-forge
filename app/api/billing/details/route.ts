import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

/**
 * GET /api/billing/details
 * Fetches the authenticated user's billing details:
 * - Current subscription info
 * - Recent invoices
 * - Payment methods on file
 */

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    logger.error('STRIPE_SECRET_KEY not configured');
    return null;
  }
  stripeClient = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
  return stripeClient;
}

export async function GET(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Billing service not configured' },
        { status: 503 }
      );
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Authentication service not configured' },
        { status: 503 }
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get Stripe customer ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      // No Stripe customer yet — return empty state
      return NextResponse.json({
        subscription: null,
        invoices: [],
        paymentMethods: [],
      });
    }

    const customerId = profile.stripe_customer_id;

    // Fetch subscription, invoices, and payment methods in parallel
    const [subscriptionsResult, invoicesResult, paymentMethodsResult] = await Promise.allSettled([
      stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1,
        expand: ['data.default_payment_method'],
      }),
      stripe.invoices.list({
        customer: customerId,
        limit: 10,
      }),
      stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      }),
    ]);

    // Parse subscription
    let subscription = null;
    if (subscriptionsResult.status === 'fulfilled' && subscriptionsResult.value.data.length > 0) {
      const sub = subscriptionsResult.value.data[0] as unknown as Record<string, unknown>;
      subscription = {
        id: sub.id as string,
        status: sub.status as string,
        plan: ((sub.metadata as Record<string, string> | undefined)?.plan) || 'unknown',
        current_period_end: new Date((sub.current_period_end as number) * 1000).toISOString(),
        current_period_start: new Date((sub.current_period_start as number) * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end as boolean,
      };
    }

    // Parse invoices
    let invoices: Array<{
      id: string;
      amount_paid: number;
      currency: string;
      status: string | null;
      created: number;
      invoice_pdf: string | null;
      hosted_invoice_url: string | null;
    }> = [];
    if (invoicesResult.status === 'fulfilled') {
      invoices = invoicesResult.value.data.map((inv) => ({
        id: inv.id,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status as string | null,
        created: inv.created,
        invoice_pdf: inv.invoice_pdf ?? null,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
      }));
    }

    // Parse payment methods
    let paymentMethods: Array<{
      id: string;
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    }> = [];
    if (paymentMethodsResult.status === 'fulfilled') {
      paymentMethods = paymentMethodsResult.value.data
        .filter((pm) => pm.card)
        .map((pm) => ({
          id: pm.id,
          brand: pm.card!.brand,
          last4: pm.card!.last4,
          exp_month: pm.card!.exp_month,
          exp_year: pm.card!.exp_year,
        }));
    }

    return NextResponse.json({
      subscription,
      invoices,
      paymentMethods,
    });
  } catch (error) {
    logger.error('Failed to fetch billing details', error);
    return NextResponse.json(
      { error: 'Failed to load billing details' },
      { status: 500 }
    );
  }
}
