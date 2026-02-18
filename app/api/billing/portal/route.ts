import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for the authenticated user.
 * Allows users to manage their subscription, update payment methods,
 * view invoices, and cancel/resubscribe from Stripe's hosted portal.
 */

// Lazy-load Stripe client
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

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Billing service not configured' },
        { status: 503 }
      );
    }

    // Authenticate the user via Supabase server client
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Supabase credentials not configured');
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

    // Fetch the user's profile to get their Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile', profileError, { userId: user.id });
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    let customerId = profile.stripe_customer_id;

    // If the user doesn't have a Stripe customer ID yet, create one
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: profile.email || user.email || undefined,
          name: profile.name || undefined,
          metadata: {
            supabase_user_id: user.id,
          },
        });

        customerId = customer.id;

        // Save the Stripe customer ID to the profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateError) {
          logger.error('Failed to save Stripe customer ID', updateError, {
            userId: user.id,
            customerId,
          });
          // Continue anyway — the portal session can still be created
        }

        logger.info('Created Stripe customer for user', {
          userId: user.id,
          customerId,
        });
      } catch (err) {
        logger.error('Failed to create Stripe customer', err, { userId: user.id });
        return NextResponse.json(
          { error: 'Failed to initialize billing account' },
          { status: 500 }
        );
      }
    }

    // Parse optional return URL from request body
    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://agent-forge.app'}/billing`;

    // Create a Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    logger.info('Customer portal session created', {
      userId: user.id,
      customerId,
      portalSessionId: portalSession.id,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      logger.error('Stripe error creating portal session', error);

      if (error.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid billing configuration. Please contact support.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Billing service error. Please try again later.' },
        { status: 502 }
      );
    }

    logger.error('Unexpected error creating portal session', error);
    return NextResponse.json(
      { error: 'Failed to open billing portal' },
      { status: 500 }
    );
  }
}
