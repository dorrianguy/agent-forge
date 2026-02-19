'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { hasFeature, TIERS } from '@/lib/tiers';
import type { TierSlug, TierConfig } from '@/lib/tiers';

type FeatureFlag = keyof TierConfig['featureFlags'];

const FEATURE_LABELS: Record<FeatureFlag, string> = {
  voiceAgents: 'Voice Agents',
  analytics: 'Analytics',
  apiAccess: 'API Access',
  customBranding: 'Custom Branding',
  teamMembers: 'Team Members',
  prioritySupport: 'Priority Support',
  advancedTemplates: 'Advanced Templates',
  campaignCalling: 'Campaign Calling',
  postCallAnalysis: 'Post-Call Analysis',
  whiteLabel: 'White Label',
};

function getRequiredTier(feature: FeatureFlag): TierSlug {
  const order: TierSlug[] = ['starter', 'pro', 'business'];
  for (const tier of order) {
    if (TIERS[tier].featureFlags[feature]) return tier;
  }
  return 'business';
}

interface FeatureGateProps {
  feature: FeatureFlag;
  tier: TierSlug;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function FeatureGate({ feature, tier, children, fallback }: FeatureGateProps): React.ReactElement {
  if (hasFeature(tier, feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredTier = getRequiredTier(feature);
  const label = FEATURE_LABELS[feature];

  return (
    <motion.div
      className="relative rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Greyed-out glimpse of the content */}
      <div className="pointer-events-none select-none opacity-20 blur-[2px]">
        {children}
      </div>

      {/* Lock overlay */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[1px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.25 }}
      >
        <motion.div
          className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Lock className="w-5 h-5 text-orange-400/80" />
        </motion.div>
        <p className="text-white/70 text-sm font-medium mb-1">{label}</p>
        <p className="text-white/40 text-xs mb-4">
          Upgrade to <span className="text-orange-400 capitalize">{requiredTier}</span> to unlock
        </p>
        <Link href="/pricing">
          <motion.span
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            View Plans
            <ArrowUpRight className="w-3 h-3" />
          </motion.span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
