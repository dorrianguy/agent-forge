'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneCall, PhoneOff, Volume2, Mic, Clock,
  BarChart3, TrendingUp, TrendingDown, Users, Calendar,
  Play, Pause, Settings, ChevronRight, Plus, X,
  Check, Copy, Download, Filter, Search, Flame,
  ArrowLeft, ExternalLink, MessageSquare, Code2, GitBranch, Radio
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Import the actual voice components
import VoiceAgentCard from '@/src/components/voice/VoiceAgentCard';
import ActiveCallsPanel from '@/src/components/voice/ActiveCallsPanel';
import CallHistoryTable from '@/src/components/voice/CallHistoryTable';
import PhoneNumberManager from '@/src/components/voice/PhoneNumberManager';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// Mock voice analytics data
const mockVoiceStats = {
  totalCalls: 1247,
  totalMinutes: 4523,
  averageDuration: 3.6,
  successRate: 87,
  activeCampaigns: 3,
  phoneNumbers: 2,
  monthlySpend: 156.80,
};

const mockRecentCalls = [
  { id: '1', direction: 'inbound', from: '+1 555-0123', to: '+1 888-0001', duration: 245, outcome: 'completed', sentiment: 0.8, timestamp: new Date(Date.now() - 3600000) },
  { id: '2', direction: 'outbound', from: '+1 888-0001', to: '+1 555-0456', duration: 180, outcome: 'voicemail', sentiment: 0, timestamp: new Date(Date.now() - 7200000) },
  { id: '3', direction: 'inbound', from: '+1 555-0789', to: '+1 888-0001', duration: 420, outcome: 'transferred', sentiment: 0.6, timestamp: new Date(Date.now() - 10800000) },
  { id: '4', direction: 'outbound', from: '+1 888-0002', to: '+1 555-0321', duration: 300, outcome: 'completed', sentiment: 0.9, timestamp: new Date(Date.now() - 14400000) },
  { id: '5', direction: 'inbound', from: '+1 555-0654', to: '+1 888-0001', duration: 90, outcome: 'no_answer', sentiment: 0, timestamp: new Date(Date.now() - 18000000) },
];

const mockCampaigns = [
  { id: '1', name: 'Lead Follow-up Q4', status: 'running', contacted: 234, total: 500, successRate: 32 },
  { id: '2', name: 'Appointment Reminders', status: 'running', contacted: 89, total: 120, successRate: 78 },
  { id: '3', name: 'Customer Survey', status: 'paused', contacted: 45, total: 200, successRate: 65 },
];

const mockPhoneNumbers = [
  { id: '1', number: '+1 888-0001', name: 'Main Support Line', agent: 'Support Agent', calls: 892, status: 'active' },
  { id: '2', number: '+1 888-0002', name: 'Sales Outbound', agent: 'Sales Agent', calls: 355, status: 'active' },
];

// Mock voice agents data
const mockVoiceAgents = [
  {
    id: 'agent-1',
    name: 'Support Bot',
    type: 'customer_support',
    status: 'live',
    phoneNumber: '+1 (888) 555-0001',
    stats: { inboundCalls: 892, outboundCalls: 234, activeCalls: 2 },
    lastActive: '2 mins ago'
  },
  {
    id: 'agent-2',
    name: 'Sales Assistant',
    type: 'sales_outbound',
    status: 'live',
    phoneNumber: '+1 (888) 555-0002',
    stats: { inboundCalls: 355, outboundCalls: 1203, activeCalls: 0 },
    lastActive: '15 mins ago'
  },
  {
    id: 'agent-3',
    name: 'Lead Qualifier',
    type: 'lead_qualification',
    status: 'offline',
    phoneNumber: '+1 (888) 555-0003',
    stats: { inboundCalls: 127, outboundCalls: 89, activeCalls: 0 },
    lastActive: '2 hours ago'
  }
];

export default function VoiceDashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'overview' | 'agents' | 'active' | 'calls' | 'campaigns' | 'numbers'>('overview');
  const [selectedCall, setSelectedCall] = useState<typeof mockRecentCalls[0] | null>(null);
  const [dateRange, setDateRange] = useState('7d');

  // Format duration to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get sentiment color
  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.4) return 'text-yellow-400';
    if (score > 0) return 'text-red-400';
    return 'text-white/40';
  };

  // Get outcome badge
  const getOutcomeBadge = (outcome: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
      transferred: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Transferred' },
      voicemail: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Voicemail' },
      no_answer: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'No Answer' },
    };
    const badge = badges[outcome] || badges.completed;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Voice Analytics</h1>
                  <p className="text-xs text-white/50">Monitor your voice agents</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>

              <Link href="/build/voice">
                <motion.button
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium flex items-center gap-2 shadow-lg shadow-purple-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-4 h-4" />
                  New Voice Agent
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Section Tabs */}
          <nav className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto">
            {([
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'agents', label: 'Voice Agents', icon: Mic },
              { id: 'active', label: 'Active Calls', icon: Radio },
              { id: 'calls', label: 'Call History', icon: PhoneCall },
              { id: 'campaigns', label: 'Campaigns', icon: Users },
              { id: 'numbers', label: 'Phone Numbers', icon: Phone },
              { id: 'embed', label: 'Widget Embed', icon: Code2, href: '/dashboard/voice/embed' },
              { id: 'flows', label: 'Flow Editor', icon: GitBranch, href: '/voice-flow-editor' },
            ] as const).map((tab) => (
              tab.href ? (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-white/50 hover:text-white transition"
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </Link>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                    activeSection === tab.id
                      ? 'border-purple-500 text-white'
                      : 'border-transparent text-white/50 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div variants={fadeInUp} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +12%
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{mockVoiceStats.totalCalls.toLocaleString()}</p>
                <p className="text-sm text-white/50">Total Calls</p>
              </motion.div>

              <motion.div variants={fadeInUp} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/50 text-xs">{mockVoiceStats.averageDuration}m avg</span>
                </div>
                <p className="text-3xl font-bold text-white">{mockVoiceStats.totalMinutes.toLocaleString()}</p>
                <p className="text-sm text-white/50">Minutes Used</p>
              </motion.div>

              <motion.div variants={fadeInUp} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +5%
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{mockVoiceStats.successRate}%</p>
                <p className="text-sm text-white/50">Success Rate</p>
              </motion.div>

              <motion.div variants={fadeInUp} className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">${mockVoiceStats.monthlySpend.toFixed(2)}</p>
                <p className="text-sm text-white/50">Monthly Usage</p>
              </motion.div>
            </div>

            {/* Recent Calls and Campaigns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Calls */}
              <motion.div variants={fadeInUp} className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Recent Calls</h3>
                  <button
                    onClick={() => setActiveSection('calls')}
                    className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {mockRecentCalls.slice(0, 5).map((call) => (
                    <div key={call.id} className="px-5 py-4 hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedCall(call)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            call.direction === 'inbound' ? 'bg-green-500/20' : 'bg-blue-500/20'
                          }`}>
                            {call.direction === 'inbound' ? (
                              <PhoneCall className="w-4 h-4 text-green-400" />
                            ) : (
                              <PhoneOff className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{call.from}</p>
                            <p className="text-xs text-white/40">{formatDuration(call.duration)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getOutcomeBadge(call.outcome)}
                          <p className="text-xs text-white/40 mt-1">
                            {call.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Active Campaigns */}
              <motion.div variants={fadeInUp} className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Active Campaigns</h3>
                  <button
                    onClick={() => setActiveSection('campaigns')}
                    className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300 transition"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {mockCampaigns.map((campaign) => (
                    <div key={campaign.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            campaign.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                          }`} />
                          <p className="text-sm text-white font-medium">{campaign.name}</p>
                        </div>
                        <span className="text-xs text-white/50">{campaign.successRate}% success</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                            style={{ width: `${(campaign.contacted / campaign.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50">{campaign.contacted}/{campaign.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Voice Agents Section - Using VoiceAgentCard component */}
        {activeSection === 'agents' && (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Voice Agents</h2>
                <p className="text-white/50 text-sm mt-1">Manage your AI voice agents</p>
              </div>
              <Link href="/build/voice">
                <motion.button
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium flex items-center gap-2 shadow-lg shadow-purple-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-4 h-4" />
                  Create Agent
                </motion.button>
              </Link>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={staggerContainer}
            >
              {mockVoiceAgents.map((agent, index) => (
                <VoiceAgentCard
                  key={agent.id}
                  agent={agent}
                  index={index}
                  onClick={() => router.push(`/dashboard/voice/${agent.id}`)}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Active Calls Section - Using ActiveCallsPanel component */}
        {activeSection === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold">Active Calls</h2>
              <p className="text-white/50 text-sm mt-1">Real-time call monitoring</p>
            </div>
            <ActiveCallsPanel
              agentId="all"
              onCallEnd={(callId: string) => console.log('Call ended:', callId)}
            />
          </motion.div>
        )}

        {/* Call History Section - Using CallHistoryTable component */}
        {activeSection === 'calls' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CallHistoryTable agentId="all" />
          </motion.div>
        )}

        {/* Campaigns Section */}
        {activeSection === 'campaigns' && (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Campaigns</h2>
              <motion.button
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium flex items-center gap-2 shadow-lg shadow-purple-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </motion.button>
            </div>

            <div className="grid gap-4">
              {mockCampaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  variants={fadeInUp}
                  className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                        <p className="text-sm text-white/50">{campaign.total} contacts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                        campaign.status === 'running'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {campaign.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition">
                        {campaign.status === 'running' ? (
                          <Pause className="w-4 h-4 text-white/60" />
                        ) : (
                          <Play className="w-4 h-4 text-white/60" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">{campaign.contacted}</p>
                      <p className="text-xs text-white/50">Contacted</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">{campaign.total - campaign.contacted}</p>
                      <p className="text-xs text-white/50">Remaining</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-2xl font-bold text-white">{campaign.successRate}%</p>
                      <p className="text-xs text-white/50">Success Rate</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                        style={{ width: `${(campaign.contacted / campaign.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/50">{Math.round((campaign.contacted / campaign.total) * 100)}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phone Numbers Section - Using PhoneNumberManager component */}
        {activeSection === 'numbers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="-mx-6 -my-8"
          >
            <PhoneNumberManager />
          </motion.div>
        )}
      </main>

      {/* Call Detail Modal */}
      <AnimatePresence>
        {selectedCall && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedCall(null)} />
            <motion.div
              className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Call Details</h3>
                <button onClick={() => setSelectedCall(null)} className="p-2 hover:bg-white/10 rounded-lg transition">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedCall.direction === 'inbound' ? 'bg-green-500/20' : 'bg-blue-500/20'
                  }`}>
                    {selectedCall.direction === 'inbound' ? (
                      <PhoneCall className="w-6 h-6 text-green-400" />
                    ) : (
                      <PhoneOff className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium capitalize">{selectedCall.direction} Call</p>
                    <p className="text-sm text-white/50">{selectedCall.timestamp.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/50 mb-1">From</p>
                    <p className="text-white font-medium">{selectedCall.from}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/50 mb-1">To</p>
                    <p className="text-white font-medium">{selectedCall.to}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/50 mb-1">Duration</p>
                    <p className="text-white font-medium">{formatDuration(selectedCall.duration)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-white/50 mb-1">Outcome</p>
                    {getOutcomeBadge(selectedCall.outcome)}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition font-medium flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" />
                    Play Recording
                  </button>
                  <button className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition font-medium flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    View Transcript
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
