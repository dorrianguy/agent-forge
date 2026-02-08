'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, Flame, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <XCircle className="w-10 h-10 text-red-500" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Payment Cancelled
        </h1>

        <p className="text-slate-400 mb-8">
          Your payment was cancelled and you have not been charged. If you encountered any issues, please don't hesitate to contact our support team.
        </p>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-orange-500 mb-4">
            <Flame className="w-6 h-6" />
            <span className="font-bold">Agent Forge</span>
          </div>

          <p className="text-sm text-slate-400">
            Ready to try again? Choose a plan that works for you.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>

          <Link
            href="/"
            className="w-full py-3 px-6 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <p className="text-sm text-slate-500 mt-6">
          Need help? <a href="mailto:support@agent-forge.app" className="text-orange-500 hover:text-orange-400">Contact Support</a>
        </p>
      </motion.div>
    </div>
  );
}
