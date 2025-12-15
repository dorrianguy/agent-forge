import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Price IDs from your Stripe dashboard
const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, userId, userEmail, pendingAgentId } = body;

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://agent-forge.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://agent-forge.app'}/pricing?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId || '',
        plan,
        pendingAgentId: pendingAgentId || '',
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          plan,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
