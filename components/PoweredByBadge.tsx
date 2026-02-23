'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

export default function PoweredByBadge() {
  return (
    <motion.a
      href="https://agent-forge.app"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:border-orange-500/40 transition-colors no-underline"
      style={{ width: 'fit-content', height: 32, fontSize: 12 }}
    >
      <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
      <span className="whitespace-nowrap font-medium">Powered by Agent Forge</span>
    </motion.a>
  );
}
