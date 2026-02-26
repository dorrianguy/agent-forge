// Agent Forge — Tier Configuration
// Single source of truth for all plan limits, features, and pricing

export type TierSlug = 'free' | 'starter' | 'pro' | 'business';

export interface TierConfig {
  slug: TierSlug;
  name: string;
  price: number;
  interval: 'month';
  agentLimit: number; // -1 = unlimited
  features: string[];
  featureFlags: {
    voiceAgents: boolean;
    analytics: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    teamMembers: boolean;
    prioritySupport: boolean;
    advancedTemplates: boolean;
    campaignCalling: boolean;
    postCallAnalysis: boolean;
    whiteLabel: boolean;
  };
  badge: boolean; // "Powered by Agent Forge" badge required
  conversationsPerMonth: number; // -1 = unlimited
  voiceMinutes: number;
  phoneNumbers: number;
  concurrentCalls: number;
}

export const TIERS: Record<TierSlug, TierConfig> = {
  free: {
    slug: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    agentLimit: 1,
    features: [
      '1 AI Agent',
      'Basic templates',
      '50 conversations/month',
      'Community support',
      'Website widget',
      '"Powered by Agent Forge" badge',
    ],
    featureFlags: {
      voiceAgents: false,
      analytics: false,
      apiAccess: false,
      customBranding: false,
      teamMembers: false,
      prioritySupport: false,
      advancedTemplates: false,
      campaignCalling: false,
      postCallAnalysis: false,
      whiteLabel: false,
    },
    badge: true,
    conversationsPerMonth: 50,
    voiceMinutes: 0,
    phoneNumbers: 0,
    concurrentCalls: 0,
  },
  starter: {
    slug: 'starter',
    name: 'Starter',
    price: 29,
    interval: 'month',
    agentLimit: 3,
    features: [
      '3 AI Agents',
      'All templates',
      '1,000 conversations/month',
      'Priority email support',
      'Website widget',
      'No "Powered by" badge',
    ],
    featureFlags: {
      voiceAgents: false,
      analytics: false,
      apiAccess: false,
      customBranding: false,
      teamMembers: false,
      prioritySupport: true,
      advancedTemplates: true,
      campaignCalling: false,
      postCallAnalysis: false,
      whiteLabel: false,
    },
    badge: false,
    conversationsPerMonth: 1000,
    voiceMinutes: 0,
    phoneNumbers: 0,
    concurrentCalls: 0,
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    price: 79,
    interval: 'month',
    agentLimit: 10,
    features: [
      '10 AI Agents',
      'Voice agents (LiveKit)',
      '5,000 conversations/month',
      '100 voice minutes/month',
      '1 phone number included',
      'Advanced analytics',
      'All integrations',
      'Priority support',
    ],
    featureFlags: {
      voiceAgents: true,
      analytics: true,
      apiAccess: false,
      customBranding: false,
      teamMembers: false,
      prioritySupport: true,
      advancedTemplates: true,
      campaignCalling: false,
      postCallAnalysis: true,
      whiteLabel: false,
    },
    badge: false,
    conversationsPerMonth: 5000,
    voiceMinutes: 100,
    phoneNumbers: 1,
    concurrentCalls: 1,
  },
  business: {
    slug: 'business',
    name: 'Business',
    price: 199,
    interval: 'month',
    agentLimit: -1,
    features: [
      'Unlimited AI Agents',
      'Voice agents + campaigns',
      'Unlimited conversations',
      '500 voice minutes/month',
      '5 phone numbers included',
      'Custom branding',
      'Team members',
      'Full API access',
      'Campaign calling',
      'Post-call analysis',
      'Dedicated support',
    ],
    featureFlags: {
      voiceAgents: true,
      analytics: true,
      apiAccess: true,
      customBranding: true,
      teamMembers: true,
      prioritySupport: true,
      advancedTemplates: true,
      campaignCalling: true,
      postCallAnalysis: true,
      whiteLabel: false,
    },
    badge: false,
    conversationsPerMonth: -1,
    voiceMinutes: 500,
    phoneNumbers: 5,
    concurrentCalls: 5,
  },
};

// Ordered list for pricing page display
export const TIER_ORDER: TierSlug[] = ['free', 'starter', 'pro', 'business'];

// The "most popular" tier highlighted on pricing page
export const FEATURED_TIER: TierSlug = 'pro';

// Helper: get tier config or default to free
export function getTierConfig(slug: string | null | undefined): TierConfig {
  if (slug && slug in TIERS) return TIERS[slug as TierSlug];
  return TIERS.free;
}

// Helper: check if user can create another agent
export function canCreateAgent(tier: TierSlug, currentCount: number): boolean {
  const config = TIERS[tier];
  if (config.agentLimit === -1) return true;
  return currentCount < config.agentLimit;
}

// Helper: get remaining agent slots
export function remainingAgentSlots(tier: TierSlug, currentCount: number): number {
  const config = TIERS[tier];
  if (config.agentLimit === -1) return Infinity;
  return Math.max(0, config.agentLimit - currentCount);
}

// Helper: check if a feature is available for a tier
export function hasFeature(tier: TierSlug, feature: keyof TierConfig['featureFlags']): boolean {
  return TIERS[tier].featureFlags[feature];
}

// Helper: get the next tier upgrade from current
export function getUpgradeTier(current: TierSlug): TierSlug | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

// Helper: check if badge is required
export function requiresBadge(tier: TierSlug): boolean {
  return TIERS[tier].badge;
}

// Map Stripe price env vars to tier slugs
export const STRIPE_PRICE_KEYS: Record<TierSlug, string> = {
  free: '', // no Stripe price for free
  starter: 'STRIPE_PRICE_STARTER',
  pro: 'STRIPE_PRICE_PRO',
  business: 'STRIPE_PRICE_BUSINESS',
};

// Paid tiers only (for checkout)
export const PAID_TIERS: TierSlug[] = ['starter', 'pro', 'business'];
