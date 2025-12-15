'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Zap, Crown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser } from '@/lib/auth';

interface Plan {
  name: string;
  price: number;
  interval: string;
  agents: number;
  features: string[];
}

interface Plans {
  [key: string]: Plan;
}

// Inner component that uses useSearchParams
function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plans>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user was redirected due to paywall
  const isRequired = searchParams.get('required') === 'true';
  const fromBuild = searchParams.get('from') === 'build';

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    // Check if user is logged in
    try {
      const user = await getUser();
      setIsAuthenticated(!!user);
    } catch {
      setIsAuthenticated(false);
    }

    // Load plans (static for now, could be from API later)
    setPlans({
      starter: {
        name: 'Starter',
        price: 49,
        interval: 'month',
        agents: 1,
        features: ['1 AI Agent', '1,000 conversations/month', 'Basic analytics', 'Email support', 'Website widget']
      },
      professional: {
        name: 'Professional',
        price: 149,
        interval: 'month',
        agents: 5,
        features: ['5 AI Agents', '10,000 conversations/month', 'Advanced analytics', 'Priority support', 'All integrations', 'Custom branding', 'API access']
      },
      enterprise: {
        name: 'Enterprise',
        price: 499,
        interval: 'month',
        agents: -1,
        features: ['Unlimited AI Agents', 'Unlimited conversations', 'Enterprise analytics', 'Dedicated support', 'Custom integrations', 'White-label option', 'SLA guarantee', 'On-premise option']
      }
    });
    setLoading(false);
  };

  const handleSelectPlan = async (planKey: string) => {
    setSelectedPlan(planKey);
    setCheckoutLoading(true);

    // If not logged in, redirect to login first (they'll come back after auth)
    if (!isAuthenticated) {
      router.push(`/login?redirect=/pricing&plan=${planKey}`);
      return;
    }

    try {
      // Get user info for Stripe
      const user = await getUser();

      // Call our checkout API
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
        // Redirect to Stripe Checkout
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition">
            <Flame className="w-8 h-8" />
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {isRequired || fromBuild ? 'Choose Your Plan' : 'Simple, Transparent Pricing'}
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {isRequired || fromBuild
              ? 'Select a plan to unlock your agent and start engaging customers.'
              : 'Choose the plan that fits your needs. All plans include a 14-day free trial.'}
          </p>
        </motion.div>

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

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-slate-400">/{plan.interval}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

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
            </motion.div>
          ))}
        </div>

        {/* FAQ or Features Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-slate-400">
            Questions? <a href="mailto:support@agentforge.ai" className="text-orange-500 hover:text-orange-400">Contact us</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function PricingLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );
}

// Main export with Suspense boundary
export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  );
}
