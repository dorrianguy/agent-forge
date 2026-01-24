'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Clock, ChevronRight } from 'lucide-react';
import type { Agent } from '@/lib/supabase';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${agent.name}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 cursor-pointer group overflow-hidden"
      whileHover={{ y: -4 }}
    >
      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{agent.name}</h3>
            <p className="text-xs text-white/50 capitalize">{agent.type.replace('_', ' ')}</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              agent.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}
            role="status"
          >
            {agent.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />}
            {agent.status === 'live' ? 'Live' : 'Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{(agent.conversations || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs">conversations</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{agent.satisfaction || 0}%</p>
            <p className="text-white/40 text-xs">satisfaction</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {agent.last_active ? new Date(agent.last_active).toLocaleDateString() : 'Just created'}
          </span>
          <span className="text-orange-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
