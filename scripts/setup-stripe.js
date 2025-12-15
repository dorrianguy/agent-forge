/**
 * Agent Forge - Stripe Setup Script
 *
 * This script creates all required Stripe products and prices for Agent Forge.
 *
 * Usage:
 * 1. Add your STRIPE_SECRET_KEY to .env file
 * 2. Run: node scripts/setup-stripe.js
 * 3. Copy the output price IDs to your .env file
 */

require('dotenv').config();
const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('\n❌ ERROR: STRIPE_SECRET_KEY not found in .env file');
  console.error('\nPlease add your Stripe secret key to .env:');
  console.error('  STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)\n');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Agent Forge pricing configuration
const PRODUCTS = [
  {
    name: 'Agent Forge Starter',
    description: '1 AI Agent, 1,000 conversations/month, Basic analytics, Email support, Website widget',
    price: 4900, // $49.00 in cents
    envVar: 'STRIPE_PRICE_STARTER'
  },
  {
    name: 'Agent Forge Professional',
    description: '5 AI Agents, 10,000 conversations/month, Advanced analytics, Priority support, All integrations, Custom branding, API access',
    price: 14900, // $149.00 in cents
    envVar: 'STRIPE_PRICE_PROFESSIONAL'
  },
  {
    name: 'Agent Forge Enterprise',
    description: 'Unlimited AI Agents, Unlimited conversations, Enterprise analytics, Dedicated support, Custom integrations, White-label option, SLA guarantee, On-premise option',
    price: 49900, // $499.00 in cents
    envVar: 'STRIPE_PRICE_ENTERPRISE'
  }
];

async function setupStripe() {
  console.log('\n🚀 Agent Forge - Stripe Setup\n');
  console.log('='.repeat(50));

  const mode = STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'TEST';
  console.log(`\n📌 Mode: ${mode}`);
  console.log(`📌 Using key: ${STRIPE_SECRET_KEY.substring(0, 12)}...${STRIPE_SECRET_KEY.slice(-4)}\n`);

  const results = [];

  for (const product of PRODUCTS) {
    console.log(`\n📦 Creating: ${product.name}`);

    try {
      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `name:'${product.name}'`
      });

      let stripeProduct;

      if (existingProducts.data.length > 0) {
        stripeProduct = existingProducts.data[0];
        console.log(`   ℹ️  Product already exists: ${stripeProduct.id}`);
      } else {
        // Create the product
        stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.description,
          metadata: {
            app: 'agent-forge',
            tier: product.name.split(' ').pop().toLowerCase()
          }
        });
        console.log(`   ✅ Product created: ${stripeProduct.id}`);
      }

      // Check for existing price
      const existingPrices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true
      });

      let stripePrice;
      const matchingPrice = existingPrices.data.find(p =>
        p.unit_amount === product.price &&
        p.recurring?.interval === 'month'
      );

      if (matchingPrice) {
        stripePrice = matchingPrice;
        console.log(`   ℹ️  Price already exists: ${stripePrice.id}`);
      } else {
        // Create the price
        stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: product.price,
          currency: 'usd',
          recurring: {
            interval: 'month'
          },
          metadata: {
            app: 'agent-forge'
          }
        });
        console.log(`   ✅ Price created: ${stripePrice.id}`);
      }

      results.push({
        name: product.name,
        productId: stripeProduct.id,
        priceId: stripePrice.id,
        envVar: product.envVar,
        amount: `$${product.price / 100}/month`
      });

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  // Output summary
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ SETUP COMPLETE!\n');
  console.log('Add these to your .env file:\n');
  console.log('-'.repeat(50));

  for (const result of results) {
    console.log(`${result.envVar}=${result.priceId}`);
  }

  console.log('-'.repeat(50));

  console.log('\n📋 Summary:');
  console.log('-'.repeat(50));
  for (const result of results) {
    console.log(`${result.name}`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  Price ID:   ${result.priceId}`);
    console.log(`  Amount:     ${result.amount}`);
    console.log('');
  }

  // Webhook reminder
  console.log('='.repeat(50));
  console.log('\n⚠️  WEBHOOK SETUP REQUIRED:\n');
  console.log('1. Go to: https://dashboard.stripe.com/webhooks');
  console.log('2. Click "Add endpoint"');
  console.log('3. Enter URL: https://your-domain.com/billing/webhook');
  console.log('4. Select events:');
  console.log('   - checkout.session.completed');
  console.log('   - customer.subscription.created');
  console.log('   - customer.subscription.updated');
  console.log('   - customer.subscription.deleted');
  console.log('   - invoice.paid');
  console.log('   - invoice.payment_failed');
  console.log('5. Copy the signing secret to .env as STRIPE_WEBHOOK_SECRET\n');

  // For local testing
  console.log('📡 For LOCAL TESTING, run:');
  console.log('   stripe listen --forward-to localhost:8000/billing/webhook\n');
}

// Run setup
setupStripe().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
