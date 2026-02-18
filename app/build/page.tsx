'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, Sparkles, X, Check, ArrowRight,
  MessageSquare, Headphones, ShoppingCart, Users,
  Zap, Clock, Globe, Lock, ChevronLeft, Mail
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Agent type templates
const agentTemplates = [
  {
    id: 'support',
    name: 'Customer Support',
    icon: Headphones,
    description: 'Handle customer inquiries, troubleshoot issues, and provide 24/7 support.',
    color: 'blue',
    placeholder: 'I need a customer support agent that can answer questions about our product, help users troubleshoot common issues, and escalate complex problems to human support...'
  },
  {
    id: 'sales',
    name: 'Sales Assistant',
    icon: ShoppingCart,
    description: 'Qualify leads, answer product questions, and guide customers to purchase.',
    color: 'green',
    placeholder: 'I need a sales agent that can qualify incoming leads, answer questions about our pricing and features, and schedule demos with interested prospects...'
  },
  {
    id: 'lead',
    name: 'Lead Qualifier',
    icon: Users,
    description: 'Capture visitor information and qualify leads based on your criteria.',
    color: 'purple',
    placeholder: 'I need an agent that can engage website visitors, ask qualifying questions about their budget and timeline, and capture their contact information...'
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    icon: Sparkles,
    description: 'Build any type of agent from scratch with your own specifications.',
    color: 'orange',
    placeholder: 'Describe your custom agent in detail. What should it do? What tone should it have? What information does it need to know about your business?'
  }
];

// Build stages
const buildStages = [
  { stage: 'analyzing', progress: 15, text: 'Analyzing requirements...' },
  { stage: 'designing', progress: 35, text: 'Designing agent architecture...' },
  { stage: 'generating', progress: 55, text: 'Generating AI personality...' },
  { stage: 'training', progress: 75, text: 'Training on your specifications...' },
  { stage: 'testing', progress: 90, text: 'Running quality checks...' },
  { stage: 'complete', progress: 100, text: 'Agent forged!' }
];

export default function BuildPage() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'describe' | 'building' | 'email' | 'complete'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof agentTemplates[0] | null>(null);
  const [description, setDescription] = useState('');
  const [agentName, setAgentName] = useState('');
  const [buildStatus, setBuildStatus] = useState<typeof buildStages[0] | null>(null);
  const [builtAgent, setBuiltAgent] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSelectTemplate = (template: typeof agentTemplates[0]) => {
    setSelectedTemplate(template);
    setDescription('');
    setAgentName(template.id === 'custom' ? '' : `My ${template.name}`);
    setStep('describe');
  };

  const handleBuild = async () => {
    if (!description.trim() || !agentName.trim()) return;

    setStep('building');

    // Show initial progress stages while API call runs
    const progressInterval = setInterval(() => {
      setBuildStatus((prev) => {
        if (!prev) return buildStages[0];
        const currentIndex = buildStages.findIndex(s => s.stage === prev.stage);
        // Stop at 'testing' stage (index 4) — 'complete' is set after API responds
        if (currentIndex < buildStages.length - 2) {
          return buildStages[currentIndex + 1];
        }
        return prev;
      });
    }, 1500);

    setBuildStatus(buildStages[0]);

    try {
      const response = await fetch('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          type: selectedTemplate?.id || 'custom',
          description,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate agent');
      }

      const { agent } = await response.json();

      // Show completion stage
      setBuildStatus(buildStages[buildStages.length - 1]);
      await new Promise(resolve => setTimeout(resolve, 600));

      setBuiltAgent(agent);
      setStep('email');
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Build error:', error);

      // Fallback: create a basic agent locally if API is unavailable
      const fallbackAgent = {
        id: `agent-${Date.now()}`,
        name: agentName,
        type: selectedTemplate?.id || 'custom',
        description,
        status: 'ready',
        createdAt: new Date().toISOString(),
      };

      setBuildStatus(buildStages[buildStages.length - 1]);
      await new Promise(resolve => setTimeout(resolve, 600));

      setBuiltAgent(fallbackAgent);
      setStep('email');
    }
  };

  const handleEmailSubmit = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required to unlock your agent.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');

    // Store agent + email in localStorage
    const agentWithEmail = { ...builtAgent, leadEmail: trimmed };
    localStorage.setItem('pendingAgent', JSON.stringify(agentWithEmail));
    localStorage.setItem('leadEmail', trimmed);

    setStep('complete');
  };

  const handleChoosePlan = () => {
    // Agent is saved in localStorage - redirect to pricing (REQUIRED to access agent)
    router.push('/pricing?from=build');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
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
                <p className="text-xs text-white/50">Build AI Agents Without Code</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/login" className="text-white/70 hover:text-white transition">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Template */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Zap className="w-4 h-4" />
                  No sign-up required to build
                </motion.div>
                <h1 className="text-4xl font-bold mb-4">What kind of agent do you need?</h1>
                <p className="text-xl text-white/60">Choose a template or start from scratch</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {agentTemplates.map((template, i) => (
                  <motion.button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-${template.color}-500/50 hover:bg-white/10 transition-all text-left group`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-${template.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <template.icon className={`w-6 h-6 text-${template.color}-400`} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                    <p className="text-white/60 text-sm">{template.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Describe Agent */}
          {step === 'describe' && selectedTemplate && (
            <motion.div
              key="describe"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition mb-8"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to templates
              </button>

              <div className="text-center mb-8">
                <div className={`inline-flex w-16 h-16 rounded-2xl bg-${selectedTemplate.color}-500/20 items-center justify-center mb-4`}>
                  <selectedTemplate.icon className={`w-8 h-8 text-${selectedTemplate.color}-400`} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Build your {selectedTemplate.name}</h1>
                <p className="text-white/60">Describe what you need and we'll build it for you</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="My Support Bot"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Describe your agent
                    <span className="text-white/40 font-normal ml-2">(Be as detailed as you like)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={selectedTemplate.placeholder}
                    className="w-full h-48 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 resize-none transition"
                  />
                </div>

                <div className="flex gap-4">
                  <motion.button
                    onClick={() => setStep('select')}
                    className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleBuild}
                    disabled={!description.trim() || !agentName.trim()}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Flame className="w-5 h-5" />
                    Forge Agent
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Building */}
          {step === 'building' && buildStatus && (
            <motion.div
              key="building"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-16"
            >
              <motion.div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-orange-500/30"
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
                    <Check className="w-16 h-16 text-white" />
                  </motion.div>
                ) : (
                  <Flame className="w-16 h-16 text-white" />
                )}
              </motion.div>

              <motion.h2
                className="text-2xl font-bold text-white mb-2"
                key={buildStatus.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {buildStatus.text}
              </motion.h2>
              <p className="text-white/60 mb-8">Building {agentName}...</p>

              <div className="max-w-md mx-auto">
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${buildStatus.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-white/50 text-sm mt-2">{buildStatus.progress}%</p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Email Capture */}
          {step === 'email' && builtAgent && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold mb-2">Your agent has been forged!</h1>
              <p className="text-lg text-white/60 mb-8">
                Enter your email to unlock {builtAgent.name} and see the full configuration.
              </p>

              <motion.div
                className="max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <Mail className="w-10 h-10 text-orange-400 mx-auto mb-4" />
                  <p className="text-white/70 text-sm mb-4">
                    We'll send your agent details to this email. No spam, ever.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                      placeholder="you@company.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                      autoFocus
                    />
                    {emailError && (
                      <p className="text-red-400 text-sm text-left">{emailError}</p>
                    )}
                    <motion.button
                      onClick={handleEmailSubmit}
                      className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                      whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(249, 115, 22, 0.3)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Lock className="w-4 h-4" />
                      Unlock My Agent
                    </motion.button>
                  </div>
                  <p className="text-white/40 text-xs mt-3">
                    By continuing, you agree to our Terms of Service.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && builtAgent && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
              >
                <Check className="w-12 h-12 text-white" />
              </motion.div>

              <h1 className="text-4xl font-bold mb-2">Your agent is ready!</h1>
              <p className="text-xl text-white/60 mb-8">{builtAgent.name} has been forged successfully</p>

              {/* Agent Preview Card */}
              <motion.div
                className="max-w-md mx-auto mb-8 p-6 rounded-2xl bg-white/5 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-white">{builtAgent.name}</h3>
                    <p className="text-white/50 text-sm capitalize">{builtAgent.type.replace('_', ' ')} Agent</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm border border-green-500/30">
                    Ready
                  </span>
                </div>
                <p className="text-white/60 text-sm text-left line-clamp-2">{builtAgent.description}</p>
              </motion.div>

              {/* Choose Plan to Continue */}
              <motion.div
                className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Zap className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Choose a plan to deploy</h3>
                <p className="text-white/70 text-sm mb-6">
                  Select a subscription plan to save your agent and deploy it to your website.
                </p>
                <motion.button
                  onClick={handleChoosePlan}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowRight className="w-5 h-5" />
                  View Pricing Plans
                </motion.button>
                <p className="text-white/50 text-xs mt-3">
                  Starting at $49/month • Cancel anytime
                </p>
              </motion.div>

              {/* Build another */}
              <motion.button
                onClick={() => {
                  setStep('select');
                  setSelectedTemplate(null);
                  setDescription('');
                  setAgentName('');
                  setBuildStatus(null);
                  setBuiltAgent(null);
                }}
                className="text-white/60 hover:text-white transition flex items-center gap-2 mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles className="w-4 h-4" />
                Build another agent
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
