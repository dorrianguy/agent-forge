'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  CreditCard,
  FileText,
  Settings,
  ArrowRight,
  Loader2,
  ExternalLink,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile } from '@/lib/auth';
import type { Profile } from '@/lib/supabase';
import { isIOS } from '@/lib/platform';
import { shouldUseIAP } from '@/lib/iap';

interface SubscriptionData {
  id: string;
  status: string;
  plan: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
}

interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string;
  hosted_invoice_url: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  // On iOS, billing is managed through App Store subscriptions
  useEffect(() => {
    if (shouldUseIAP()) {
      router.replace('/pricing');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!shouldUseIAP()) {
      fetchBillingData();
    }
  }, []);

  const fetchBillingData = async () => {
    try {
      // Check if user is authenticated
      const user = await getUser();
      if (!user) {
        router.push('/login?redirect=/billing');
        return;
      }

      // Get user profile with stripe_customer_id
      const userProfile = await getProfile();
      if (!userProfile) {
        setLoading(false);
        return;
      }
      setProfile(userProfile);

      // For now, show plan from profile
      // Full Stripe integration would fetch from Stripe API
      if (userProfile.plan && userProfile.plan !== 'free') {
        setSubscription({
          id: 'sub_placeholder',
          status: 'active',
          plan: userProfile.plan,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!profile?.stripe_customer_id) return;

    setPortalLoading(true);
    try {
      // TODO: Implement Stripe Customer Portal via API route
      alert('Stripe Customer Portal coming soon. Contact support for billing changes.');
    } catch (error) {
      console.error('Failed to open portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateOrTimestamp: string | number) => {
    const date = typeof dateOrTimestamp === 'string'
      ? new Date(dateOrTimestamp)
      : new Date(dateOrTimestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'past_due': return 'text-yellow-500 bg-yellow-500/10';
      case 'canceled': return 'text-red-500 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-400/10';
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

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition">
            <Flame className="w-8 h-8" />
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
          <p className="text-slate-400">Manage your subscription and payment details</p>
        </motion.div>

        {!profile?.stripe_customer_id && !subscription ? (
          /* No subscription state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Active Subscription</h2>
            <p className="text-slate-400 mb-6">
              Get started with Agent Forge by choosing a plan that fits your needs.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600"
            >
              View Plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Current Subscription */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-500" />
                  Current Plan
                </h2>
                <button
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                  className="text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Manage Subscription
                      <ExternalLink className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>

              {subscription ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-white capitalize">
                        {subscription.plan || 'Unknown'} Plan
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      {subscription.cancel_at_period_end ? (
                        <span>Cancels on {formatDate(subscription.current_period_end)}</span>
                      ) : (
                        <span>Renews on {formatDate(subscription.current_period_end)}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/pricing"
                    className="py-2 px-4 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700"
                  >
                    Change Plan
                  </Link>
                </div>
              ) : (
                <div className="text-slate-400">
                  <p>No active subscription found.</p>
                  <Link href="/pricing" className="text-orange-500 hover:text-orange-400">
                    Choose a plan
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Payment Methods */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  Payment Methods
                </h2>
                <button
                  onClick={openCustomerPortal}
                  className="text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1"
                >
                  Add New
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-slate-700 rounded flex items-center justify-center text-xs font-medium text-white uppercase">
                          {pm.brand}
                        </div>
                        <div>
                          <p className="text-white">**** **** **** {pm.last4}</p>
                          <p className="text-sm text-slate-400">
                            Expires {pm.exp_month}/{pm.exp_year}
                          </p>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No payment methods on file.</p>
              )}
            </motion.div>

            {/* Billing History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-orange-500" />
                Billing History
              </h2>

              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl"
                    >
                      <div>
                        <p className="text-white">
                          {formatCurrency(invoice.amount_paid, invoice.currency)}
                        </p>
                        <p className="text-sm text-slate-400">
                          {formatDate(invoice.created)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          invoice.status === 'paid'
                            ? 'text-green-500 bg-green-500/10'
                            : 'text-yellow-500 bg-yellow-500/10'
                        }`}>
                          {invoice.status}
                        </span>
                        {invoice.invoice_pdf && (
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:text-orange-400"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No invoices yet.</p>
              )}
            </motion.div>
          </div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center text-slate-400 text-sm"
        >
          <p>
            Need help with billing? <a href="mailto:support@agent-forge.app" className="text-orange-500 hover:text-orange-400">Contact Support</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
