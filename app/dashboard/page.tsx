'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, MessageSquare, BarChart3, Star, Plus, X,
  Settings, Activity, Clock, Sparkles, Copy,
  Check, Play, Pause, LogOut, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile, getAgents, updateAgent, signOut, savePendingAgentToDb } from '@/lib/auth';
import type { Profile, Agent } from '@/lib/supabase';
import VoiceAssistant from '@/components/VoiceAssistant';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import StatCard from '@/components/dashboard/StatCard';
import AgentCard from '@/components/dashboard/AgentCard';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { shouldUseIAP } from '@/lib/iap';

// Animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check auth and load data
  useEffect(() => {
    async function loadData() {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/login?redirect=/dashboard');
          return;
        }

        // Load profile first to check subscription
        const profileData = await getProfile();

        // HARD PAYWALL: Only paid users can access dashboard
        // No agents leave before payment is secured
        if (!profileData || profileData.plan === 'free' || !profileData.plan) {
          router.push('/pricing?required=true');
          return;
        }

        // Save any pending agent from the builder (only after payment confirmed)
        await savePendingAgentToDb();

        // Load agents
        const agentsData = await getAgents();

        setProfile(profileData);
        setAgents(agentsData);
      } catch {
        router.push('/login?redirect=/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Calculate stats
  const stats = {
    totalAgents: agents.length,
    activeConversations: agents.reduce((sum, a) => sum + (a.conversations || 0), 0),
    messagesThisMonth: agents.reduce((sum, a) => sum + (a.conversations || 0) * 12, 0),
    satisfaction: agents.length > 0
      ? Math.round(agents.reduce((sum, a) => sum + (a.satisfaction || 0), 0) / agents.length)
      : 0
  };

  const animatedAgents = useAnimatedCounter(stats.totalAgents, 800);
  const animatedConversations = useAnimatedCounter(stats.activeConversations, 1000);
  const animatedMessages = useAnimatedCounter(stats.messagesThisMonth, 1500);
  const animatedSatisfaction = useAnimatedCounter(stats.satisfaction, 1200);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const copyEmbedCode = (agentId: string) => {
    navigator.clipboard.writeText(`<script src="https://agent-forge.app/widget/${agentId}"></script>`);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const toggleAgentStatus = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const newStatus = agent.status === 'live' ? 'paused' : 'live';

    try {
      await updateAgent(agentId, { status: newStatus });
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: newStatus } : a
      ));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent({ ...selectedAgent, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Flame className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <motion.div
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.05 }}
                >
                  <Flame className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold">Agent Forge</h1>
                  <p className="text-xs text-white/50">Dashboard</p>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                {/* Navigation Tabs */}
                <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  {['agents', 'analytics', 'settings'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>

                <Link href="/build">
                  <motion.button
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4" />
                    New Agent
                  </motion.button>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-medium"
                  >
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-12 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="p-4 border-b border-white/5">
                          <p className="text-white font-medium">{profile?.name}</p>
                          <p className="text-white/50 text-sm">{profile?.email}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded capitalize">
                            {profile?.plan || 'free'} plan
                          </span>
                        </div>
                        <div className="p-2">
                          {!shouldUseIAP() && (
                            <Link href="/billing" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition">
                              <CreditCard className="w-4 h-4 text-white/50" />
                              <span className="text-white/70">Billing</span>
                            </Link>
                          )}
                          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition">
                            <Settings className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Settings</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-red-400"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome Message */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-white">
              Welcome back, {profile?.name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="text-white/50">Here's what's happening with your agents.</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <StatCard title="Total Agents" value={animatedAgents} icon={Bot} color="blue" trend={`${agents.length} active`} />
            <StatCard title="Total Conversations" value={animatedConversations} icon={MessageSquare} color="green" trend="All time" />
            <StatCard title="Messages This Month" value={animatedMessages.toLocaleString()} icon={BarChart3} color="purple" trend="Current period" />
            <StatCard title="Satisfaction Rate" value={`${animatedSatisfaction}%`} icon={Star} color="yellow" trend="Average" />
          </motion.div>

          {/* Agents Section */}
          <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Agents</h2>
                <p className="text-white/50 text-sm mt-1">Manage and monitor your AI workforce</p>
              </div>
            </div>

            {agents.length === 0 ? (
              <motion.div className="text-center py-16 rounded-2xl bg-white/5 border border-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No agents yet</h3>
                <p className="text-white/50 mb-6">Create your first AI agent to get started</p>
                <Link href="/build">
                  <motion.button
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold inline-flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Sparkles className="w-5 h-5" />
                    Create Your First Agent
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" variants={staggerContainer} initial="hidden" animate="visible">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
                ))}
                <Link href="/build">
                  <motion.div
                    variants={fadeInUp}
                    className="p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors">
                      <Plus className="w-6 h-6 text-white/40 group-hover:text-orange-400 transition-colors" />
                    </div>
                    <span className="text-white/40 font-medium group-hover:text-white/70 transition-colors">Create New Agent</span>
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </motion.div>

        </main>
      </div>

      {/* Voice Assistant - wrapped in ErrorBoundary to prevent crashes */}
      <ErrorBoundary>
        <VoiceAssistant
          userName={profile?.name?.split(' ')[0]}
          onNavigate={(path) => router.push(path)}
          autoGreet={true}
        />
      </ErrorBoundary>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedAgent(null)} />
            <motion.div
              className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="h-32 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-purple-500/20 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 text-white/60 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pb-6 -mt-12 relative">
                <div className="flex items-end gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg border-4 border-slate-900">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white">{selectedAgent.name}</h3>
                    <p className="text-white/50 capitalize">{selectedAgent.type.replace('_', ' ')} Agent</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedAgent.status === 'live'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {selectedAgent.status === 'live' ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                      </span>
                    ) : 'Ready'}
                  </span>
                </div>

                {selectedAgent.description && (
                  <p className="text-white/60 text-sm mb-6">{selectedAgent.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Conversations', value: (selectedAgent.conversations || 0).toLocaleString(), icon: MessageSquare },
                    { label: 'Satisfaction', value: `${selectedAgent.satisfaction || 0}%`, icon: Star },
                    { label: 'Response Time', value: selectedAgent.response_time || '—', icon: Clock },
                    { label: 'Last Active', value: selectedAgent.last_active ? new Date(selectedAgent.last_active).toLocaleDateString() : '—', icon: Activity }
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <stat.icon className="w-4 h-4 text-white/40 mb-2" />
                      <p className="text-white font-semibold">{stat.value}</p>
                      <p className="text-white/40 text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Embed Code */}
                <div className="mb-6">
                  <label className="text-white/60 text-sm mb-2 block">Embed Code</label>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-black/30 text-xs text-white/70 overflow-x-auto border border-white/5">
{`<script src="https://agent-forge.app/widget/${selectedAgent.id}"></script>`}
                    </pre>
                    <button
                      onClick={() => copyEmbedCode(selectedAgent.id)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                    >
                      {copiedEmbed ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition font-medium flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                  <button className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition font-medium flex items-center justify-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </button>
                  <button
                    onClick={() => toggleAgentStatus(selectedAgent.id)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                  >
                    {selectedAgent.status === 'live' ? (
                      <><Pause className="w-4 h-4" />Pause</>
                    ) : (
                      <><Play className="w-4 h-4" />Go Live</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
