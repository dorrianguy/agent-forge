/**
 * Voice Components Demo
 * Demonstration page for PhoneNumberManager and VoiceTestPlayground
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, TestTube, ChevronRight } from 'lucide-react';
import PhoneNumberManager from './PhoneNumberManager';
import VoiceTestPlayground from './VoiceTestPlayground';

export default function VoiceDemo() {
  const [activeView, setActiveView] = useState('numbers'); // 'numbers' or 'playground'

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <motion.div
        className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Voice Features</h1>
            <nav className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <motion.button
                onClick={() => setActiveView('numbers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeView === 'numbers'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Phone className="w-4 h-4" />
                Phone Numbers
              </motion.button>
              <motion.button
                onClick={() => setActiveView('playground')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeView === 'playground'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TestTube className="w-4 h-4" />
                Test Playground
              </motion.button>
            </nav>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeView === 'numbers' ? (
          <PhoneNumberManager />
        ) : (
          <VoiceTestPlayground />
        )}
      </motion.div>
    </div>
  );
}
