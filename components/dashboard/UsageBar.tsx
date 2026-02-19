'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { TierSlug } from '@/lib/tiers';
import UpgradePrompt from './UpgradePrompt';

interface UsageBarProps {
  current: number;
  limit: number;
  label: string;
  tier: TierSlug;
}

function getBarColor(percent: number): string {
  if (percent > 95) return 'from-red-500 to-red-600';
  if (percent > 80) return 'from-orange-500 to-orange-600';
  if (percent > 50) return 'from-yellow-500 to-yellow-600';
  return 'from-green-500 to-emerald-500';
}

export default function UsageBar({ current, limit, label, tier }: UsageBarProps) {
  if (limit === -1) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-white/70">{label}</span>
          <span className="text-sm text-white/50">Unlimited</span>
        </div>
      </div>
    );
  }

  const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const barColor = getBarColor(percent);

  return (
    <div>
      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">{label}</span>
          <span className="text-sm text-white/50">
            {current.toLocaleString()} / {limit.toLocaleString()} used
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
      {percent > 80 && (
        <UpgradePrompt
          currentTier={tier}
          reason={`You've used ${percent}% of your ${label.toLowerCase()} limit`}
          className="mt-2"
        />
      )}
    </div>
  );
}
