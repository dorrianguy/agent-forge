/**
 * Agent Forge - Main Dashboard
 * Beautiful, animated React dashboard with micro-interactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Flame, Bot, MessageSquare, BarChart3, Star, Plus, X,
  Zap, Globe, Shield, Rocket, Settings, ChevronRight,
  Activity, TrendingUp, Clock, Users, Sparkles, Copy,
  Check, ExternalLink, Play, Pause, MoreVertical, Phone
} from 'lucide-react';

// Import voice components
import VoiceAgentCard from './components/VoiceAgentCard';
import VoiceAgentBuilder from './components/VoiceAgentBuilder';
import ActiveCallsPanel from './components/ActiveCallsPanel';

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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 }
};

// Animated counter hook
function useAnimatedCounter(target, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

// Particle background component
function ParticleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-orange-500/30 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            opacity: [0.3, 0]
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5
          }}
        />
      ))}
    </div>
  );
}

// Animated gradient orb
function GradientOrb({ className }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 180, 360]
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

// Main Dashboard Component
export default function AgentForgeDashboard() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeConversations: 0,
    messagesThisMonth: 0,
    satisfaction: 0
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [buildStatus, setBuildStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isCreatingVoiceAgent, setIsCreatingVoiceAgent] = useState(false);
  const [voiceAgents, setVoiceAgents] = useState([]);
  const [voiceStats, setVoiceStats] = useState({
    totalCallsToday: 0,
    activeCalls: 0,
    avgDuration: '0m 0s'
  });

  // Animated stats
  const animatedAgents = useAnimatedCounter(stats.totalAgents, 800);
  const animatedConversations = useAnimatedCounter(stats.activeConversations, 1000);
  const animatedMessages = useAnimatedCounter(stats.messagesThisMonth, 1500);
  const animatedSatisfaction = useAnimatedCounter(stats.satisfaction, 1200);

  // Load mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setAgents([
        {
          id: 'agent-1',
          name: 'Support Bot',
          type: 'customer_support',
          status: 'live',
          conversations: 1234,
          satisfaction: 94,
          responseTime: '1.2s',
          lastActive: '2 min ago'
        },
        {
          id: 'agent-2',
          name: 'Sales Assistant',
          type: 'sales',
          status: 'live',
          conversations: 567,
          satisfaction: 91,
          responseTime: '0.8s',
          lastActive: '5 min ago'
        },
        {
          id: 'agent-3',
          name: 'Lead Qualifier',
          type: 'lead_gen',
          status: 'paused',
          conversations: 234,
          satisfaction: 88,
          responseTime: '1.5s',
          lastActive: '1 hour ago'
        }
      ]);

      setStats({
        totalAgents: 3,
        activeConversations: 47,
        messagesThisMonth: 12543,
        satisfaction: 92
      });

      // Load voice agents mock data
      setVoiceAgents([
        {
          id: 'voice-1',
          name: 'Customer Support Line',
          phoneNumber: '+1 (555) 123-4567',
          status: 'active',
          callsToday: 42,
          avgDuration: '3m 24s',
          satisfaction: 96
        },
        {
          id: 'voice-2',
          name: 'Sales Hotline',
          phoneNumber: '+1 (555) 987-6543',
          status: 'active',
          callsToday: 28,
          avgDuration: '5m 12s',
          satisfaction: 93
        }
      ]);

      setVoiceStats({
        totalCallsToday: 70,
        activeCalls: 3,
        avgDuration: '4m 18s'
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateAgent = async () => {
    if (!newAgentDescription.trim()) return;

    const stages = [
      { stage: 'analyzing', progress: 15, text: 'Analyzing requirements...' },
      { stage: 'designing', progress: 35, text: 'Designing agent architecture...' },
      { stage: 'generating', progress: 55, text: 'Generating AI code...' },
      { stage: 'testing', progress: 75, text: 'Running quality tests...' },
      { stage: 'deploying', progress: 90, text: 'Deploying to edge network...' },
      { stage: 'complete', progress: 100, text: 'Agent forged!' }
    ];

    for (let i = 0; i < stages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setBuildStatus(stages[i]);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const newAgent = {
      id: `agent-${Date.now()}`,
      name: 'Custom Agent',
      type: 'custom',
      status: 'live',
      conversations: 0,
      satisfaction: 0,
      responseTime: '—',
      lastActive: 'Just now'
    };

    setAgents(prev => [...prev, newAgent]);
    setIsCreating(false);
    setBuildStatus(null);
    setNewAgentDescription('');
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(`<script src="https://agentforge.ai/widget/${selectedAgent?.id}"></script>`);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <GradientOrb className="w-96 h-96 bg-orange-500 -top-48 -left-48" />
      <GradientOrb className="w-96 h-96 bg-purple-500 -bottom-48 -right-48" />
      <ParticleBackground />

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
              >
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
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    Agent Forge
                  </h1>
                  <p className="text-xs text-white/50">Build AI Agents Without Code</p>
                </div>
              </motion.div>

              <div className="flex items-center gap-4">
                {/* Navigation Tabs */}
                <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  {['agents', 'voice', 'analytics', 'settings'].map((tab) => (
                    <motion.button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        activeTab === tab
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {tab === 'voice' && <Phone className="w-4 h-4" />}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </motion.button>
                  ))}
                </nav>

                <motion.button
                  onClick={() => setIsCreating(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-4 h-4" />
                  Create Agent
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Conditional content based on active tab */}
          {activeTab === 'agents' && (
            <>
              {/* Stats Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <StatCard
                  title="Total Agents"
                  value={animatedAgents}
                  icon={Bot}
                  color="blue"
                  trend="+2 this week"
                  delay={0}
                />
                <StatCard
                  title="Active Conversations"
                  value={animatedConversations}
                  icon={MessageSquare}
                  color="green"
                  trend="12% increase"
                  delay={0.1}
                />
                <StatCard
                  title="Messages This Month"
                  value={animatedMessages.toLocaleString()}
                  icon={BarChart3}
                  color="purple"
                  trend="+3,421 today"
                  delay={0.2}
                />
                <StatCard
                  title="Satisfaction Rate"
                  value={`${animatedSatisfaction}%`}
                  icon={Star}
                  color="yellow"
                  trend="Above target"
                  delay={0.3}
                />
              </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              { icon: Zap, label: 'Quick Build', color: 'orange' },
              { icon: Globe, label: 'Deploy', color: 'blue' },
              { icon: Shield, label: 'Security', color: 'green' },
              { icon: Rocket, label: 'Upgrade', color: 'purple' }
            ].map((action, i) => (
              <motion.button
                key={action.label}
                variants={fadeInUp}
                className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <action.icon className={`w-5 h-5 mb-2 text-${action.color}-400 group-hover:scale-110 transition-transform`} />
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Agents Section */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Agents</h2>
                <p className="text-white/50 text-sm mt-1">Manage and monitor your AI workforce</p>
              </div>
              <motion.button
                className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-sm font-medium"
                whileHover={{ x: 5 }}
              >
                View all <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {agents.map((agent, index) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                  index={index}
                />
              ))}

              {/* Add New Agent Card */}
              <motion.button
                variants={fadeInUp}
                onClick={() => setIsCreating(true)}
                className="p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center min-h-[200px] group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors"
                  whileHover={{ rotate: 90 }}
                  transition={{ type: "spring" }}
                >
                  <Plus className="w-6 h-6 text-white/40 group-hover:text-orange-400 transition-colors" />
                </motion.div>
                <span className="text-white/40 font-medium group-hover:text-white/70 transition-colors">Create New Agent</span>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl bg-white/5 border border-white/5 p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Live Activity
            </h3>
            <div className="space-y-3">
              {[
                { text: 'Support Bot resolved ticket #4521', time: '2 min ago', type: 'success' },
                { text: 'Sales Assistant qualified new lead', time: '5 min ago', type: 'info' },
                { text: 'New conversation started with Support Bot', time: '8 min ago', type: 'default' }
              ].map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-400' :
                      activity.type === 'info' ? 'bg-blue-400' : 'bg-white/40'
                    }`} />
                    <span className="text-white/70 text-sm">{activity.text}</span>
                  </div>
                  <span className="text-white/40 text-xs">{activity.time}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
            </>
          )}

          {/* Voice Tab Content */}
          {activeTab === 'voice' && (
            <>
              {/* Voice Stats Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <StatCard
                  title="Total Calls Today"
                  value={voiceStats.totalCallsToday}
                  icon={Phone}
                  color="blue"
                  trend="+12 from yesterday"
                  delay={0}
                />
                <StatCard
                  title="Active Calls"
                  value={voiceStats.activeCalls}
                  icon={Activity}
                  color="green"
                  trend="Live now"
                  delay={0.1}
                />
                <StatCard
                  title="Avg Duration"
                  value={voiceStats.avgDuration}
                  icon={Clock}
                  color="purple"
                  trend="+30s today"
                  delay={0.2}
                />
              </motion.div>

              {/* Active Calls Panel */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ActiveCallsPanel />
              </motion.div>

              {/* Voice Agents Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Voice Agents</h2>
                    <p className="text-white/50 text-sm mt-1">Manage your AI voice assistants</p>
                  </div>
                  <motion.button
                    onClick={() => setIsCreatingVoiceAgent(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-4 h-4" />
                    Create Voice Agent
                  </motion.button>
                </div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {voiceAgents.map((agent, index) => (
                    <VoiceAgentCard
                      key={agent.id}
                      agent={agent}
                      index={index}
                    />
                  ))}

                  {/* Add New Voice Agent Card */}
                  <motion.button
                    variants={fadeInUp}
                    onClick={() => setIsCreatingVoiceAgent(true)}
                    className="p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center min-h-[200px] group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-orange-500/20 transition-colors"
                      whileHover={{ rotate: 90 }}
                      transition={{ type: "spring" }}
                    >
                      <Plus className="w-6 h-6 text-white/40 group-hover:text-orange-400 transition-colors" />
                    </motion.div>
                    <span className="text-white/40 font-medium group-hover:text-white/70 transition-colors">Create Voice Agent</span>
                  </motion.button>
                </motion.div>
              </motion.div>
            </>
          )}

          {/* Analytics Tab Placeholder */}
          {activeTab === 'analytics' && (
            <motion.div
              className="flex items-center justify-center h-96"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Analytics Coming Soon</h3>
                <p className="text-white/50">Advanced analytics and insights will be available here.</p>
              </div>
            </motion.div>
          )}

          {/* Settings Tab Placeholder */}
          {activeTab === 'settings' && (
            <motion.div
              className="flex items-center justify-center h-96"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <Settings className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Settings Coming Soon</h3>
                <p className="text-white/50">Configure your Agent Forge workspace here.</p>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Create Agent Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !buildStatus && setIsCreating(false)}
            />

            <motion.div
              className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* Modal gradient header */}
              <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-purple-500" />

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
                      animate={buildStatus ? { rotate: 360 } : {}}
                      transition={{ duration: 2, repeat: buildStatus ? Infinity : 0, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Forge New Agent</h3>
                      <p className="text-white/50 text-sm">Describe your AI assistant</p>
                    </div>
                  </div>
                  {!buildStatus && (
                    <motion.button
                      onClick={() => setIsCreating(false)}
                      className="text-white/40 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!buildStatus ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <textarea
                        value={newAgentDescription}
                        onChange={(e) => setNewAgentDescription(e.target.value)}
                        placeholder="Example: I need a customer support agent that can answer questions about our SaaS product, help users troubleshoot issues, and escalate complex problems to human support..."
                        className="w-full h-40 bg-white/5 rounded-xl p-4 text-white placeholder:text-white/30 border border-white/10 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none transition-all"
                      />

                      <div className="flex gap-3 mt-4">
                        <motion.button
                          onClick={() => setIsCreating(false)}
                          className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          onClick={handleCreateAgent}
                          disabled={!newAgentDescription.trim()}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                          whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Flame className="w-4 h-4" />
                          Forge Agent
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-8"
                    >
                      <div className="flex flex-col items-center">
                        <motion.div
                          className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30"
                          animate={{
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              "0 20px 40px rgba(249, 115, 22, 0.3)",
                              "0 20px 60px rgba(249, 115, 22, 0.5)",
                              "0 20px 40px rgba(249, 115, 22, 0.3)"
                            ]
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {buildStatus.stage === 'complete' ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", damping: 10 }}
                            >
                              <Check className="w-10 h-10 text-white" />
                            </motion.div>
                          ) : (
                            <Flame className="w-10 h-10 text-white" />
                          )}
                        </motion.div>

                        <motion.p
                          className="text-white font-medium text-lg mb-2"
                          key={buildStatus.text}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {buildStatus.text}
                        </motion.p>

                        <div className="w-full max-w-xs">
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${buildStatus.progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-white/50 text-sm mt-2 text-center">{buildStatus.progress}%</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedAgent(null)}
            />

            <motion.div
              className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* Gradient header */}
              <div className="h-32 bg-gradient-to-br from-orange-500/20 via-red-500/20 to-purple-500/20 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <motion.button
                  onClick={() => setSelectedAgent(null)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="px-6 pb-6 -mt-12 relative">
                <div className="flex items-end gap-4 mb-6">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25 border-4 border-slate-900"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Bot className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white">{selectedAgent.name}</h3>
                    <p className="text-white/50">{selectedAgent.type.replace('_', ' ')}</p>
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
                    ) : 'Paused'}
                  </span>
                </div>

                <motion.div
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    { label: 'Conversations', value: selectedAgent.conversations.toLocaleString(), icon: MessageSquare },
                    { label: 'Satisfaction', value: `${selectedAgent.satisfaction}%`, icon: Star },
                    { label: 'Response Time', value: selectedAgent.responseTime, icon: Clock },
                    { label: 'Last Active', value: selectedAgent.lastActive, icon: Activity }
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      variants={fadeInUp}
                      className="p-4 rounded-xl bg-white/5 border border-white/5"
                    >
                      <stat.icon className="w-4 h-4 text-white/40 mb-2" />
                      <p className="text-white font-semibold">{stat.value}</p>
                      <p className="text-white/40 text-xs">{stat.label}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Embed Code */}
                <div className="mb-6">
                  <label className="text-white/60 text-sm mb-2 block">Embed Code</label>
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-black/30 text-xs text-white/70 overflow-x-auto border border-white/5">
{`<script src="https://agentforge.ai/widget/${selectedAgent.id}"></script>`}
                    </pre>
                    <motion.button
                      onClick={copyEmbedCode}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {copiedEmbed ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white/60" />
                      )}
                    </motion.button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </motion.button>
                  <motion.button
                    className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all font-medium flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </motion.button>
                  <motion.button
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Play className="w-4 h-4" />
                    Test Agent
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Agent Builder Modal */}
      <AnimatePresence>
        {isCreatingVoiceAgent && (
          <VoiceAgentBuilder
            isOpen={isCreatingVoiceAgent}
            onClose={() => setIsCreatingVoiceAgent(false)}
            onAgentCreated={(newAgent) => {
              setVoiceAgents(prev => [...prev, newAgent]);
              setIsCreatingVoiceAgent(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, trend, delay }) {
  const colorMap = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    yellow: 'from-yellow-500 to-orange-500'
  };

  const bgColorMap = {
    blue: 'bg-blue-500/10',
    green: 'bg-green-500/10',
    purple: 'bg-purple-500/10',
    yellow: 'bg-yellow-500/10'
  };

  return (
    <motion.div
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group"
      variants={fadeInUp}
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.1)' }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${bgColorMap[color]}`} />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <motion.div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>
          <motion.div
            className="flex items-center gap-1 text-green-400 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.5 }}
          >
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </motion.div>
        </div>

        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/50">{title}</p>
      </div>
    </motion.div>
  );
}

// Agent Card Component
function AgentCard({ agent, onClick, index }) {
  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 cursor-pointer group overflow-hidden"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Hover gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Bot className="w-6 h-6 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{agent.name}</h3>
            <p className="text-xs text-white/50">{agent.type.replace('_', ' ')}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            agent.status === 'live'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {agent.status === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
            {agent.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{agent.conversations.toLocaleString()}</p>
            <p className="text-white/40 text-xs">conversations</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{agent.satisfaction}%</p>
            <p className="text-white/40 text-xs">satisfaction</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {agent.lastActive}
          </span>
          <motion.span
            className="text-orange-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ x: 3 }}
          >
            View details <ChevronRight className="w-3 h-3" />
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}
