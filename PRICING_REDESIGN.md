# Agent Forge Pricing Redesign — Hybrid Credits Model

_Spec for transitioning from flat-tier to hybrid subscription + credits._
_Date: February 11, 2026_

---

## Current State

| Plan | Price | Agents | Conversations | Voice Min | Phone Numbers |
|------|-------|--------|---------------|-----------|---------------|
| Starter | $79/mo | 1 | 1,000/mo | 100/mo | 1 |
| Professional | $249/mo | 5 | 10,000/mo | 500/mo | 5 |
| Enterprise | $799/mo | Unlimited | Unlimited | 2,000/mo | Unlimited |

**Problem:** Flat pricing with "unlimited conversations" on Enterprise means one power user can burn through your LLM budget. Conversations at $79/mo with 1,000 conversations = $0.079/conversation — but Claude API costs ~$0.03-0.05/conversation. Razor-thin margins on high-usage Starter users.

---

## New Pricing Structure

### Core Change: Base Subscription + Included Credits + Overage

**1 credit ≈ 1 AI message** (simple for customers to understand)

Voice credits are separate: **1 voice credit = 1 minute of voice**

---

### 🟢 Starter — $39/month (was $79)

| Feature | Included |
|---------|----------|
| AI Agents | 3 (was 1) |
| AI Credits | 5,000/mo (~500 conversations) |
| Voice Minutes | 50/mo |
| Phone Numbers | 1 |
| Concurrent Calls | 1 |
| Integrations | Website widget, voice widget |
| Support | Email |
| Analytics | Basic |

**Credit overage:** $0.008/credit ($8 per 1,000 messages)
**Voice overage:** $0.05/min inbound, $0.08/min outbound

**Why $39 not $79:** Lower barrier = more signups. Credit overage captures heavy users' value. Most Starter users won't exceed 5,000 credits. Those who do pay overage that's still profitable.

---

### 🔵 Pro — $99/month (was $249)

| Feature | Included |
|---------|----------|
| AI Agents | 15 (was 5) |
| AI Credits | 25,000/mo (~2,500 conversations) |
| Voice Minutes | 300/mo (was 500) |
| Phone Numbers | 5 |
| Concurrent Calls | 5 |
| Integrations | All (Slack, Discord, WhatsApp, Zapier, HubSpot, Salesforce, etc.) |
| Support | Priority (Slack channel) |
| Analytics | Advanced + post-call analysis |
| Extras | Custom branding, API access, batch campaigns, white-label widget |

**Credit overage:** $0.006/credit ($6 per 1,000 messages)
**Voice overage:** $0.05/min inbound, $0.08/min outbound

**Why $99 not $249:** Sweet spot pricing. $249 was too far from $79 — created a dead zone. $99 is impulse-upgrade territory. More agents + credits make it obviously better value.

---

### 🟣 Scale — $299/month (NEW tier)

| Feature | Included |
|---------|----------|
| AI Agents | Unlimited |
| AI Credits | 100,000/mo (~10,000 conversations) |
| Voice Minutes | 1,000/mo |
| Phone Numbers | 15 |
| Concurrent Calls | 15 |
| Team Seats | 5 included |
| Integrations | All + custom webhook integrations |
| Support | Priority + 4-hour response SLA |
| Analytics | Enterprise-grade + sentiment analysis |
| Extras | Everything in Pro + team collaboration, custom deployments, SLA |

**Credit overage:** $0.004/credit ($4 per 1,000 messages)
**Voice overage:** $0.04/min inbound, $0.07/min outbound

---

### 🏢 Enterprise — Custom (from $499/month)

| Feature | Included |
|---------|----------|
| Everything | Unlimited |
| AI Credits | Custom volume (negotiated) |
| Voice Minutes | Custom volume |
| Self-hosted | Optional |
| SSO + SCIM | Included |
| SLA | 99.9% uptime guarantee |
| Support | Dedicated account manager |
| Extras | White-label, on-premise, custom TTS voice cloning, volume discounts |

**Credit pricing:** Volume-negotiated (typically $0.002-0.003/credit at scale)

---

## Stripe Implementation Spec

### Step 1: Create Stripe Meter

```typescript
// Create meter for AI credits
const meter = await stripe.billing.meters.create({
  display_name: 'AI Agent Credits',
  event_name: 'agent_credit_used',
  default_aggregation: { formula: 'sum' },
  customer_mapping: {
    type: 'by_id',
    event_payload_key: 'stripe_customer_id',
  },
});

// Create meter for voice minutes
const voiceMeter = await stripe.billing.meters.create({
  display_name: 'Voice Minutes',
  event_name: 'voice_minute_used',
  default_aggregation: { formula: 'sum' },
  customer_mapping: {
    type: 'by_id',
    event_payload_key: 'stripe_customer_id',
  },
});
```

### Step 2: Create Products + Prices

Each plan needs:
1. **Base subscription price** (recurring monthly)
2. **Metered price for AI credit overage** (usage-based)
3. **Metered price for voice overage** (usage-based)

```typescript
// Starter Plan
const starterBase = await stripe.prices.create({
  product: starterProductId,
  unit_amount: 3900, // $39.00
  currency: 'usd',
  recurring: { interval: 'month' },
});

const starterOverage = await stripe.prices.create({
  product: starterProductId,
  currency: 'usd',
  recurring: { interval: 'month', usage_type: 'metered' },
  unit_amount: 0.8, // $0.008 per credit
  billing_scheme: 'per_unit',
  meter: meterId,
  transform_quantity: { divide_by: 1, round: 'up' },
});
```

### Step 3: Credit Grants on Subscription Start

```typescript
// On subscription.created webhook
const creditGrant = await stripe.billing.creditGrants.create({
  customer: customerId,
  category: 'paid',
  amount: {
    type: 'monetary',
    value: { currency: 'usd', amount: 4000 }, // $40 worth = 5,000 credits at $0.008
  },
  applicability_config: {
    scope: { price_type: 'metered' },
  },
  effective_at: subscriptionStart,
  expires_at: subscriptionEnd,
});
```

### Step 4: Emit Usage Events

```typescript
// Per agent interaction
await stripe.billing.meterEvents.create({
  event_name: 'agent_credit_used',
  payload: {
    stripe_customer_id: customer.stripeId,
    value: creditsUsed.toString(), // 1 for text, variable for voice
  },
});
```

### Step 5: Credit Balance Dashboard

Add to Agent Forge dashboard:
- Real-time credit balance display
- Usage trend chart (daily/weekly/monthly)
- Projected overage alert ("At current rate, you'll exceed included credits in 8 days")
- One-click upgrade prompt when approaching limit

---

## Config.json Changes

```json
{
  "pricing": {
    "currency": "USD",
    "credit_unit": "message",
    "voice_unit": "minute",
    "plans": {
      "starter": {
        "name": "Starter",
        "price": 39,
        "interval": "month",
        "agents": 3,
        "credits_included": 5000,
        "voice_minutes": 50,
        "phone_numbers": 1,
        "concurrent_calls": 1,
        "team_seats": 1,
        "credit_overage_rate": 0.008,
        "features": [
          "3 AI Agents (text or voice)",
          "5,000 AI credits/month",
          "50 voice minutes/month",
          "1 phone number included",
          "Basic analytics",
          "Email support",
          "Website & voice widget"
        ]
      },
      "pro": {
        "name": "Pro",
        "price": 99,
        "interval": "month",
        "agents": 15,
        "credits_included": 25000,
        "voice_minutes": 300,
        "phone_numbers": 5,
        "concurrent_calls": 5,
        "team_seats": 3,
        "credit_overage_rate": 0.006,
        "features": [
          "15 AI Agents (text or voice)",
          "25,000 AI credits/month",
          "300 voice minutes/month",
          "5 phone numbers included",
          "Advanced analytics + post-call analysis",
          "Priority support",
          "All integrations",
          "Custom branding & white-label widget",
          "API access",
          "Batch calling campaigns"
        ]
      },
      "scale": {
        "name": "Scale",
        "price": 299,
        "interval": "month",
        "agents": -1,
        "credits_included": 100000,
        "voice_minutes": 1000,
        "phone_numbers": 15,
        "concurrent_calls": 15,
        "team_seats": 5,
        "credit_overage_rate": 0.004,
        "features": [
          "Unlimited AI Agents",
          "100,000 AI credits/month",
          "1,000 voice minutes/month",
          "15 phone numbers included",
          "5 team seats included",
          "Enterprise analytics + sentiment analysis",
          "Priority support + 4-hour SLA",
          "Custom deployments",
          "Team collaboration",
          "SLA guarantee"
        ]
      },
      "enterprise": {
        "name": "Enterprise",
        "price": 499,
        "interval": "month",
        "agents": -1,
        "credits_included": -1,
        "voice_minutes": -1,
        "phone_numbers": -1,
        "concurrent_calls": 20,
        "team_seats": -1,
        "credit_overage_rate": 0,
        "features": [
          "Unlimited everything",
          "Custom credit volume",
          "Self-hosted option",
          "SSO + SCIM",
          "Dedicated account manager",
          "99.9% uptime SLA",
          "White-label",
          "Custom TTS voice cloning",
          "On-premise deployment"
        ]
      }
    },
    "voice_overage": {
      "per_minute_inbound": 0.05,
      "per_minute_outbound": 0.08,
      "sms_per_message": 0.01,
      "additional_number_local": 2.00,
      "additional_number_toll_free": 5.00
    },
    "annual_discount": 0.20
  }
}
```

---

## Migration Plan

1. **Existing customers:** Grandfather at current pricing for 90 days, then migrate to nearest equivalent plan
2. **New signups:** New pricing immediately
3. **Communication:** Email + in-app banner announcing "more agents, lower prices, credits model"
4. **Stripe:** Create new Products/Prices, don't modify existing (for grandfather period)

---

## Pricing Page Updates Needed

1. Update `config.json` with new plans
2. Update `app/pricing/page.tsx` to show credit counts + overage rates
3. Add credit calculator widget ("How many credits do I need?")
4. Add annual pricing toggle (20% discount)
5. Update JSON-LD schema for SEO
6. Add comparison section (vs. Voiceflow, Botpress)
