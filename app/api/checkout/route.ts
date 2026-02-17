import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Price IDs - MUST be configured in environment
const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

function validatePriceIds(): boolean {
  const missing = Object.entries(PRICE_IDS)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    logger.error('Missing Stripe price IDs', undefined, { missing });
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') || 'unknown';

    const rateLimitResult = checkRateLimit(`checkout:${ip}`, {
      maxRequests: 10,
      windowMs: 60000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Verify authentication using Supabase server client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized checkout attempt', { ip });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!validatePriceIds()) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { plan, pendingAgentId } = body;

    if (!plan || !PRICE_IDS[plan]) {
      logger.warn('Invalid plan selected', { plan, userId: user.id });
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl && process.env.NODE_ENV === 'production') {
      logger.error('NEXT_PUBLIC_APP_URL not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const baseUrl = appUrl || 'http://localhost:3000';

    // Create checkout session with VERIFIED user data
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plan]!, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        plan,
        pendingAgentId: pendingAgentId || '',
      },
      subscription_data: {
        metadata: { userId: user.id, plan },
      },
    });

    logger.info('Checkout session created', { userId: user.id, plan, sessionId: session.id });

    return NextResponse.json(
      { sessionId: session.id, url: session.url },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    logger.error('Stripe checkout error', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
