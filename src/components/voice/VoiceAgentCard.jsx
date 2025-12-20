/**
 * VoiceAgentCard - Card displaying voice agent
 * Features: Agent name, type, status, phone number, call stats, pulse animation
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneIncoming, PhoneOutgoing, Radio, ChevronRight, Clock } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function VoiceAgentCard({ agent, onClick, index = 0 }) {
  const {
    id,
    name,
    type,
    status = 'offline',
    phoneNumber,
    stats = {
      inboundCalls: 0,
      outboundCalls: 0,
      activeCalls: 0
    },
    lastActive
  } = agent;

  const isLive = status === 'live';
  const hasActiveCalls = stats.activeCalls > 0;

  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 cursor-pointer group overflow-hidden"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Hover gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <motion.div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative ${
              isLive
                ? 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/20'
                : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/20'
            }`}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Phone className="w-6 h-6 text-white" />

            {/* Pulse animation for active calls */}
            {hasActiveCalls && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-purple-500"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{name}</h3>
            <p className="text-xs text-white/50">{type.replace(/_/g, ' ')}</p>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            isLive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-slate-500/20 text-slate-400'
          }`}>
            {isLive && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
            {status}
          </span>
        </div>

        {/* Phone Number */}
        <div className="mb-4 p-3 rounded-lg bg-white/5 flex items-center gap-2">
          <Phone className="w-4 h-4 text-purple-400" />
          <span className="text-white/70 text-sm font-mono">{phoneNumber || '+1 (555) 000-0000'}</span>
        </div>

        {/* Call Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <motion.div
            className="p-3 rounded-lg bg-white/5 relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
          >
            <PhoneIncoming className="w-3.5 h-3.5 text-blue-400 mb-1" />
            <p className="text-white font-medium text-sm">{stats.inboundCalls}</p>
            <p className="text-white/40 text-xs">inbound</p>
          </motion.div>

          <motion.div
            className="p-3 rounded-lg bg-white/5 relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
          >
            <PhoneOutgoing className="w-3.5 h-3.5 text-green-400 mb-1" />
            <p className="text-white font-medium text-sm">{stats.outboundCalls}</p>
            <p className="text-white/40 text-xs">outbound</p>
          </motion.div>

          <motion.div
            className={`p-3 rounded-lg relative overflow-hidden ${
              hasActiveCalls ? 'bg-purple-500/20' : 'bg-white/5'
            }`}
            whileHover={{ scale: 1.02 }}
            animate={hasActiveCalls ? {
              boxShadow: [
                "0 0 0 0 rgba(168, 85, 247, 0)",
                "0 0 0 4px rgba(168, 85, 247, 0.1)",
                "0 0 0 0 rgba(168, 85, 247, 0)"
              ]
            } : {}}
            transition={{ duration: 2, repeat: hasActiveCalls ? Infinity : 0 }}
          >
            <Radio className={`w-3.5 h-3.5 mb-1 ${hasActiveCalls ? 'text-purple-400' : 'text-white/40'}`} />
            <p className={`font-medium text-sm ${hasActiveCalls ? 'text-purple-400' : 'text-white'}`}>
              {stats.activeCalls}
            </p>
            <p className="text-white/40 text-xs">active</p>
          </motion.div>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lastActive || 'Never'}
          </span>
          <motion.span
            className="text-purple-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ x: 3 }}
          >
            View details <ChevronRight className="w-3 h-3" />
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}
