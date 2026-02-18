'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  User,
  Bell,
  Shield,
  Key,
  Save,
  Loader2,
  Check,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile, updateProfile } from '@/lib/auth';
import type { Profile } from '@/lib/supabase';

type SettingsTab = 'profile' | 'notifications' | 'security' | 'api';

interface NotificationPreferences {
  email_weekly_summary: boolean;
  email_payment_receipts: boolean;
  email_usage_alerts: boolean;
  email_product_updates: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  email_weekly_summary: true,
  email_payment_receipts: true,
  email_usage_alerts: true,
  email_product_updates: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Notification state
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);

  // API key state
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/login?redirect=/settings');
          return;
        }

        const profileData = await getProfile();
        if (profileData) {
          setProfile(profileData);
          setName(profileData.name || '');
          setEmail(profileData.email || user.email || '');
        }
      } catch {
        router.push('/login?redirect=/settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [router]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError(null);
    try {
      // Store notification preferences in profile metadata
      // This would be saved to a notifications_preferences JSON column
      // For now, simulate save
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save notification preferences';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = async () => {
    // Generate a random API key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = `af_${Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')}`;
    setApiKey(key);
    setShowApiKey(true);
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="flex items-center gap-2 text-orange-500 hover:text-orange-400 transition">
              <Flame className="w-8 h-8" />
            </Link>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-slate-400">Manage your account, notifications, and API access</p>
        </motion.div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:w-56 flex-shrink-0"
          >
            <div className="flex md:flex-col gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.nav>

          {/* Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-500" />
                  Profile Information
                </h2>

                <div className="space-y-5">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold">
                      {name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{name || 'User'}</p>
                      <p className="text-white/50 text-sm capitalize">{profile?.plan || 'free'} plan</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>

                  {/* Plan Info */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium capitalize">{profile?.plan || 'Free'} Plan</p>
                        <p className="text-white/50 text-sm">
                          {profile?.plan === 'free' || !profile?.plan
                            ? 'Upgrade to unlock more features'
                            : 'Your current subscription plan'}
                        </p>
                      </div>
                      <Link
                        href="/billing"
                        className="text-sm text-orange-500 hover:text-orange-400 transition"
                      >
                        Manage Billing →
                      </Link>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {saved && (
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Saved
                      </span>
                    )}
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 hover:shadow-orange-500/40 transition-shadow"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  Email Notifications
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      key: 'email_weekly_summary' as const,
                      title: 'Weekly Summary',
                      description: 'Receive a weekly email with your agent stats and performance metrics.',
                    },
                    {
                      key: 'email_payment_receipts' as const,
                      title: 'Payment Receipts',
                      description: 'Get email receipts when payments are processed.',
                    },
                    {
                      key: 'email_usage_alerts' as const,
                      title: 'Usage Alerts',
                      description: 'Get notified when you\'re approaching your plan\'s usage limits.',
                    },
                    {
                      key: 'email_product_updates' as const,
                      title: 'Product Updates',
                      description: 'Stay informed about new features and improvements.',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div>
                        <p className="text-white font-medium">{item.title}</p>
                        <p className="text-white/50 text-sm">{item.description}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          notifications[item.key] ? 'bg-orange-500' : 'bg-white/10'
                        }`}
                        role="switch"
                        aria-checked={notifications[item.key]}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${
                            notifications[item.key] ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  {/* Save Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {saved && (
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Saved
                      </span>
                    )}
                    <button
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Security
                </h2>

                <div className="space-y-6">
                  {/* Password Change */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="text-white font-medium mb-2">Change Password</h3>
                    <p className="text-white/50 text-sm mb-4">
                      Update your password to keep your account secure.
                    </p>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white text-sm font-medium transition">
                      Change Password
                    </button>
                  </div>

                  {/* Active Sessions */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="text-white font-medium mb-2">Active Sessions</h3>
                    <p className="text-white/50 text-sm mb-4">
                      Manage where you&apos;re signed in. Sign out of sessions you don&apos;t recognize.
                    </p>
                    <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <div>
                          <p className="text-white text-sm">Current Session</p>
                          <p className="text-white/40 text-xs">This browser</p>
                        </div>
                      </div>
                      <span className="text-green-400 text-xs font-medium">Active</span>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                    <h3 className="text-red-400 font-medium mb-2">Danger Zone</h3>
                    <p className="text-white/50 text-sm mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === 'api' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Key className="w-5 h-5 text-orange-500" />
                  API Keys
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  Use API keys to interact with your agents programmatically.
                </p>

                <div className="space-y-4">
                  {/* Generate Key */}
                  {!apiKey ? (
                    <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center">
                      <Key className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <h3 className="text-white font-medium mb-2">No API Keys</h3>
                      <p className="text-white/50 text-sm mb-4">
                        Generate an API key to start integrating with Agent Forge.
                      </p>
                      <button
                        onClick={generateApiKey}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium inline-flex items-center gap-2 shadow-lg shadow-orange-500/25"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate API Key
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-medium">Your API Key</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-4 h-4 text-white/60" />
                            ) : (
                              <Eye className="w-4 h-4 text-white/60" />
                            )}
                          </button>
                          <button
                            onClick={copyApiKey}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                          >
                            {copiedKey ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-white/60" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-black/30 font-mono text-sm">
                        <code className="text-white/70">
                          {showApiKey ? apiKey : `af_${'•'.repeat(48)}`}
                        </code>
                      </div>
                      <p className="text-white/40 text-xs mt-2">
                        Keep this key secret. Do not share it or expose it in client-side code.
                      </p>
                    </div>
                  )}

                  {/* API Documentation Link */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="text-white font-medium mb-2">API Documentation</h3>
                    <p className="text-white/50 text-sm mb-3">
                      Learn how to use the Agent Forge API to create, manage, and interact with your agents programmatically.
                    </p>
                    <Link
                      href="/docs"
                      className="text-orange-500 hover:text-orange-400 text-sm font-medium transition"
                    >
                      View Documentation →
                    </Link>
                  </div>

                  {/* Rate Limits */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h3 className="text-white font-medium mb-3">Rate Limits</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-white font-medium">
                          {profile?.plan === 'enterprise' ? '1,000' : profile?.plan === 'professional' ? '500' : '100'}
                        </p>
                        <p className="text-white/40 text-xs">requests/minute</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-white font-medium">
                          {profile?.plan === 'enterprise' ? '1M' : profile?.plan === 'professional' ? '100K' : '10K'}
                        </p>
                        <p className="text-white/40 text-xs">requests/day</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
