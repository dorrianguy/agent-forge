'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <motion.nav
      className="relative z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
              <motion.div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                animate={{
                  boxShadow: [
                    "0 10px 40px rgba(249, 115, 22, 0.25)",
                    "0 10px 60px rgba(249, 115, 22, 0.4)",
                    "0 10px 40px rgba(249, 115, 22, 0.25)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold">Agent Forge</h1>
                <p className="text-xs text-white/50">Build AI Agents Without Code</p>
              </div>
            </motion.div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-white/70 hover:text-white transition hidden md:block">
              Pricing
            </Link>
            <Link href="/login" className="text-white/70 hover:text-white transition hidden md:block">
              Sign In
            </Link>
            <Link href="/login?action=build">
              <motion.button
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-4 h-4" />
                Start Building
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
