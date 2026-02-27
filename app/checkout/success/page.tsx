'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Flame, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProfile } from '@/lib/auth';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id');
  const [loading, setLoading] = useState(true);
  const [sessionDetails, setSessionDetails] = useState<any>(null);

  useEffect(() => {
    verifySession();
  }, [sessionId]);

  const verifySession = async () => {
    try {
      // Get user's profile to show their plan
      const profile = await getProfile();
      if (profile) {
        setSessionDetails({
          plan: profile.plan,
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Failed to verify session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
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
          className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-500" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Payment Successful!
        </h1>

        <p className="text-slate-400 mb-8">
          Thank you for subscribing to Agent Forge. Your account has been upgraded and you now have access to all the features in your plan.
        </p>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-orange-500 mb-4">
            <Flame className="w-6 h-6" />
            <span className="font-bold">Agent Forge</span>
          </div>

          {sessionDetails && (
            <div className="text-sm text-slate-400">
              <p>Subscription activated</p>
              {sessionDetails.plan && (
                <p className="text-white font-medium mt-1 capitalize">
                  {sessionDetails.plan} Plan
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/billing"
            className="w-full py-3 px-6 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 flex items-center justify-center"
          >
            Manage Subscription
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
