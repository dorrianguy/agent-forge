import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/emailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper to get customer details
async function getCustomerDetails(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return {
      email: customer.email || '',
      name: customer.name || 'there',
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
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
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get customer details
        const customerDetails = await getCustomerDetails(session.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        const plan = session.metadata?.plan || 'unknown';
        const formattedPlan = formatPlanName(plan);

        // Send welcome email
        await sendWelcomeEmail(
          customerDetails.email,
          customerDetails.name,
          formattedPlan
        );

        console.log(`Welcome email sent to ${customerDetails.email} for ${formattedPlan} plan`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get customer details
        const customerDetails = await getCustomerDetails(invoice.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        // Get subscription to retrieve plan metadata
        let plan = 'Subscription';
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId as string
            );
            plan = formatPlanName((subscription as any).metadata?.plan || 'subscription');
          } catch (error) {
            console.error('Error fetching subscription:', error);
          }
        }

        // Send payment success email
        await sendPaymentSuccessEmail(
          customerDetails.email,
          customerDetails.name,
          invoice.amount_paid,
          plan,
          invoice.hosted_invoice_url || undefined
        );

        console.log(`Payment success email sent to ${customerDetails.email}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get customer details
        const customerDetails = await getCustomerDetails(invoice.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        // Get subscription to retrieve plan metadata
        let plan = 'Subscription';
        let retryDate: string | undefined;

        const failedSubId = (invoice as any).subscription;
        if (failedSubId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              failedSubId as string
            );
            plan = formatPlanName((subscription as any).metadata?.plan || 'subscription');

            // Calculate next retry date if available
            if (invoice.next_payment_attempt) {
              retryDate = new Date(invoice.next_payment_attempt * 1000).toLocaleDateString();
            }
          } catch (error) {
            console.error('Error fetching subscription:', error);
          }
        }

        // Send payment failed email
        await sendPaymentFailedEmail(
          customerDetails.email,
          customerDetails.name,
          invoice.amount_due,
          plan,
          retryDate
        );

        console.log(`Payment failed email sent to ${customerDetails.email}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Get customer details
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        const plan = formatPlanName((subscription as any).metadata?.plan || 'subscription');
        const endDate = new Date((subscription as any).current_period_end * 1000).toLocaleDateString();

        // Send subscription canceled email
        await sendSubscriptionCanceledEmail(
          customerDetails.email,
          customerDetails.name,
          plan,
          endDate
        );

        console.log(`Subscription canceled email sent to ${customerDetails.email}`);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`New subscription created: ${subscription.id}`);
        // Additional logic can be added here (e.g., update database)
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription updated: ${subscription.id}`);
        // Additional logic can be added here (e.g., handle plan changes)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
