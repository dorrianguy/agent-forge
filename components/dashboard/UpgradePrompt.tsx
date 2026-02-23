'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getUpgradeTier, TIERS } from '@/lib/tiers';
import type { TierSlug } from '@/lib/tiers';

interface UpgradePromptProps {
  currentTier: TierSlug;
  reason: string;
  className?: string;
}

export default function UpgradePrompt({ currentTier, reason, className }: UpgradePromptProps) {
  const nextTierSlug = getUpgradeTier(currentTier);
  if (!nextTierSlug) return null;

  const nextTier = TIERS[nextTierSlug];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/20 p-4 ${className || ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 blur-xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-white/90">
            {reason}. Upgrade to <span className="font-semibold text-orange-400">{nextTier.name}</span> for more agents, conversations, and features.
          </p>
        </div>
        <Link href="/pricing" className="shrink-0">
          <motion.button
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-orange-500/25"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Upgrade
            <ArrowUpRight className="w-3.5 h-3.5" />
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
