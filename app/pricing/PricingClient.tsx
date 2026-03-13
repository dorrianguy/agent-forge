'use client';

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Zap, Crown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { shouldUseIAP } from '@/lib/iap';

interface Plan {
  name: string;
  price: number;
  interval: string;
  features: string[];
}

interface PricingClientProps {
  plans: Record<string, Plan>;
}

function PricingContent({ plans }: PricingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isRequired = searchParams?.get('required') === 'true';
  const fromBuild = searchParams?.get('from') === 'build';
  const isIOSNative = shouldUseIAP();

  React.useEffect(() => {
    getUser().then(user => setIsAuthenticated(!!user)).catch(() => setIsAuthenticated(false));
  }, []);

  const handleSelectPlan = async (planKey: string) => {
    setSelectedPlan(planKey);
    setCheckoutLoading(true);

    if (!isAuthenticated) {
      router.push(`/login?redirect=/pricing&plan=${planKey}`);
      return;
    }

    try {
      const user = await getUser();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          userId: user?.id,
          userEmail: user?.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const getPlanIcon = (key: string) => {
    switch (key) {
      case 'starter': return <Zap className="w-6 h-6" />;
      case 'professional': return <Flame className="w-6 h-6" />;
      case 'enterprise': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getPlanColor = (key: string) => {
    switch (key) {
      case 'starter': return 'from-blue-500 to-cyan-500';
      case 'professional': return 'from-orange-500 to-red-500';
      case 'enterprise': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <>
      {/* Paywall Alert Banner */}
      {(isRequired || fromBuild) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">
              {fromBuild ? 'Your agent is ready!' : 'Subscription Required'}
            </h3>
            <p className="text-slate-300 text-sm">
              {fromBuild
                ? 'Choose a plan below to deploy your agent and access your dashboard.'
                : 'A paid subscription is required to access your agents. Choose a plan to continue.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {Object.entries(plans).map(([key, plan], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-2xl p-8 ${
              key === 'professional'
                ? 'bg-gradient-to-b from-orange-500/20 to-slate-900 border-2 border-orange-500/50'
                : 'bg-slate-900/50 border border-slate-800'
            }`}
          >
            {key === 'professional' && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                Most Popular
              </div>
            )}

            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${getPlanColor(key)} mb-4`}>
              {getPlanIcon(key)}
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>

            {!isIOSNative && (
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-slate-400">/{plan.interval}</span>
              </div>
            )}

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {isIOSNative ? (
              <p className="text-sm text-slate-400 text-center">
                Manage your subscription in Settings &gt; your name &gt; Subscriptions
              </p>
            ) : (
              <button
                onClick={() => handleSelectPlan(key)}
                disabled={checkoutLoading && selectedPlan === key}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  key === 'professional'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                } ${checkoutLoading && selectedPlan === key ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {checkoutLoading && selectedPlan === key ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </>
  );
}

function PricingLoading() {
  return (
    <div className="grid md:grid-cols-3 gap-8 mb-16">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl p-8 bg-slate-900/50 border border-slate-800 animate-pulse">
          <div className="w-12 h-12 bg-slate-800 rounded-xl mb-4" />
          <div className="w-24 h-6 bg-slate-800 rounded mb-2" />
          <div className="w-20 h-10 bg-slate-800 rounded mb-6" />
          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-full h-4 bg-slate-800 rounded" />
            ))}
          </div>
          <div className="w-full h-12 bg-slate-800 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function PricingClient({ plans }: PricingClientProps) {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent plans={plans} />
    </Suspense>
  );
}
