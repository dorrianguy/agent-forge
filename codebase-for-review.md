# Agent Forge Codebase Review

Please review this codebase for:
1. Security vulnerabilities
2. Code quality issues
3. Performance improvements
4. Best practices violations
5. Potential bugs

---

## app/page.tsx

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Bot, Zap, Shield, Globe, BarChart3,
  ArrowRight, Check, Play, Star, MessageSquare,
  Sparkles, ChevronRight, Users
} from 'lucide-react';
import Link from 'next/link';

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        className="relative z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
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
                <h1 className="text-xl font-bold">Agent Forge</h1>
                <p className="text-xs text-white/50">Build AI Agents Without Code</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-white/70 hover:text-white transition hidden md:block">
                Pricing
              </Link>
              <Link href="/login" className="text-white/70 hover:text-white transition hidden md:block">
                Sign In
              </Link>
              <Link href="/build">
                <motion.button
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Start Building
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm mb-8"
            >
              <Zap className="w-4 h-4" />
              Build powerful AI agents in minutes
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              Build AI Agents
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"> Without Code</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl text-white/60 mb-10 max-w-2xl mx-auto"
            >
              Create powerful AI agents in minutes. Just describe what you need,
              and watch your custom agent come to life. No coding required.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/build">
                <motion.button
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold text-lg flex items-center gap-3 shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bot className="w-5 h-5" />
                  Start Building
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <motion.button
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium text-lg flex items-center gap-3 hover:bg-white/10 transition"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={fadeInUp}
              className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-2 border-slate-950" />
                  ))}
                </div>
                <span className="text-white/60 text-sm">2,500+ builders</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
                <span className="text-white/60 text-sm ml-2">4.9/5 rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            className="mt-20 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-2xl blur-xl" />
              <div className="relative bg-slate-900/90 border border-white/10 rounded-2xl p-4 md:p-8 backdrop-blur">
                {/* Mock Dashboard Preview */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {['Support Bot', 'Sales Agent', 'Lead Qualifier'].map((name, i) => (
                    <motion.div
                      key={name}
                      className="p-4 rounded-xl bg-white/5 border border-white/5"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{name}</p>
                          <p className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-white font-medium">{(1234 - i * 300).toLocaleString()}</p>
                          <p className="text-white/40 text-xs">chats</p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-white font-medium">{94 - i * 2}%</p>
                          <p className="text-white/40 text-xs">satisfaction</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything you need to build
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent"> amazing agents</span>
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Powerful features that make building AI agents effortless
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered Building',
                description: 'Describe your agent in plain English. Our AI handles the rest.',
                color: 'orange'
              },
              {
                icon: Globe,
                title: 'Deploy Anywhere',
                description: 'One-click deployment to your website, app, or platform.',
                color: 'blue'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'SOC 2 compliant with end-to-end encryption.',
                color: 'green'
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                description: 'Track performance, satisfaction, and conversations.',
                color: 'purple'
              },
              {
                icon: MessageSquare,
                title: 'Multi-channel Support',
                description: 'Web, mobile, Slack, Discord, and more.',
                color: 'cyan'
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Work together with your team on agent development.',
                color: 'pink'
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition group"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-xl text-white/60">
              Three simple steps to your custom AI agent
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Describe Your Agent',
                description: 'Tell us what you need. Customer support? Sales assistant? Lead qualifier? Just describe it.'
              },
              {
                step: '02',
                title: 'Watch It Build',
                description: 'Our AI analyzes your requirements and generates a custom agent tailored to your needs.'
              },
              {
                step: '03',
                title: 'Deploy & Scale',
                description: 'Deploy with one click. Embed on your site. Watch your agent handle conversations 24/7.'
              }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-6xl font-bold text-orange-500/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/60">{item.description}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-orange-500/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative p-12 md:p-16 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Ready to build your first agent?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
                Join thousands of businesses using Agent Forge to automate conversations and scale support.
              </p>
              <Link href="/build">
                <motion.button
                  className="px-8 py-4 bg-white text-orange-600 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bot className="w-5 h-5" />
                  Start Building
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">Agent Forge</span>
          </div>
          <div className="flex items-center gap-6 text-white/60 text-sm">
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/docs" className="hover:text-white transition">Documentation</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Agent Forge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

```

## app/layout.tsx

```typescript
import type { Metadata } from 'next';
import '../src/styles/animations.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Agent Forge - Build AI Agents Without Code',
    template: '%s | Agent Forge',
  },
  description: 'Build production-ready AI agents in minutes. No coding required. Create customer support bots, sales assistants, and lead qualifiers with our autonomous AI agent builder platform.',
  keywords: ['AI agents', 'no-code AI', 'chatbot builder', 'customer support bot', 'sales assistant AI', 'lead qualification', 'autonomous agents'],
  authors: [{ name: 'Agent Forge' }],
  creator: 'Agent Forge',
  publisher: 'Agent Forge',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://agentforge.ai',
    siteName: 'Agent Forge',
    title: 'Agent Forge - Build AI Agents Without Code',
    description: 'Build production-ready AI agents in minutes. No coding required. Create customer support bots, sales assistants, and lead qualifiers.',
    images: [
      {
        url: 'https://agentforge.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Agent Forge - Build AI Agents Without Code',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Forge - Build AI Agents Without Code',
    description: 'Build production-ready AI agents in minutes. No coding required.',
    images: ['https://agentforge.ai/og-image.png'],
    creator: '@agentforge',
  },
  metadataBase: new URL('https://agentforge.ai'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950">{children}</body>
    </html>
  );
}

```

## app/build/page.tsx

```typescript
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, Sparkles, X, Check, ArrowRight,
  MessageSquare, Headphones, ShoppingCart, Users,
  Zap, Clock, Globe, Lock, ChevronLeft
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
  const [step, setStep] = useState<'select' | 'describe' | 'building' | 'complete'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof agentTemplates[0] | null>(null);
  const [description, setDescription] = useState('');
  const [agentName, setAgentName] = useState('');
  const [buildStatus, setBuildStatus] = useState<typeof buildStages[0] | null>(null);
  const [builtAgent, setBuiltAgent] = useState<any>(null);

  const handleSelectTemplate = (template: typeof agentTemplates[0]) => {
    setSelectedTemplate(template);
    setDescription('');
    setAgentName(template.id === 'custom' ? '' : `My ${template.name}`);
    setStep('describe');
  };

  const handleBuild = async () => {
    if (!description.trim() || !agentName.trim()) return;

    setStep('building');

    // Simulate build process
    for (let i = 0; i < buildStages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setBuildStatus(buildStages[i]);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Create the agent object
    const agent = {
      id: `agent-${Date.now()}`,
      name: agentName,
      type: selectedTemplate?.id || 'custom',
      description: description,
      status: 'ready',
      createdAt: new Date().toISOString()
    };

    // Store in localStorage for now (will be saved to backend after auth)
    const pendingAgent = JSON.stringify(agent);
    localStorage.setItem('pendingAgent', pendingAgent);

    setBuiltAgent(agent);
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

          {/* Step 4: Complete */}
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

```

## app/build/voice/page.tsx

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, Sparkles, Check, ArrowRight, ArrowLeft,
  Phone, Headphones, Calendar, MessageSquare, Users,
  Zap, Mic, Volume2, Settings, ChevronLeft,
  PhoneCall, PhoneOff, Play, Pause, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Voice Agent Templates
const voiceAgentTemplates = [
  {
    id: 'voice_support',
    name: 'Voice Support Agent',
    icon: Headphones,
    description: 'Handle inbound support calls 24/7. Answer questions, troubleshoot issues, and escalate when needed.',
    color: 'blue',
    placeholder: 'I need a voice agent that answers support calls, helps customers troubleshoot common issues, checks order status, and transfers to human support for complex problems...',
    features: ['Inbound calls', 'FAQ handling', 'Call transfer', 'Sentiment detection']
  },
  {
    id: 'voice_sales',
    name: 'Voice Sales Agent',
    icon: Phone,
    description: 'Make outbound sales calls, qualify leads, handle objections, and book appointments.',
    color: 'green',
    placeholder: 'I need a voice agent that makes outbound calls to leads, qualifies them based on budget and timeline, handles common objections, and books demo meetings...',
    features: ['Outbound calls', 'Lead qualification', 'Objection handling', 'Appointment booking']
  },
  {
    id: 'voice_appointment',
    name: 'Appointment Booker',
    icon: Calendar,
    description: 'Automatically schedule appointments, send reminders, and handle reschedules.',
    color: 'purple',
    placeholder: 'I need a voice agent that schedules appointments, checks calendar availability, sends SMS confirmations, and handles cancellations and reschedules...',
    features: ['Cal.com integration', 'SMS confirmations', 'Availability check', 'Rescheduling']
  },
  {
    id: 'voice_receptionist',
    name: 'AI Receptionist',
    icon: Users,
    description: 'Answer all incoming calls, route to departments, take messages, and provide information.',
    color: 'orange',
    placeholder: 'I need a voice receptionist that answers all calls, greets callers professionally, routes calls to the right department, and takes messages when people are unavailable...',
    features: ['Call routing', 'Message taking', 'Directory lookup', 'Business hours handling']
  },
  {
    id: 'voice_custom',
    name: 'Custom Voice Agent',
    icon: Sparkles,
    description: 'Build any voice agent from scratch with your own conversation flow.',
    color: 'pink',
    placeholder: 'Describe your custom voice agent. What calls should it handle? What should it say? What actions can it take?',
    features: ['Fully customizable', 'Custom flow editor', 'Any use case']
  }
];

// TTS Voice Options (sample)
const voiceOptions = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral', provider: 'openai', preview: '/voices/alloy.mp3' },
  { id: 'echo', name: 'Echo', gender: 'male', provider: 'openai', preview: '/voices/echo.mp3' },
  { id: 'fable', name: 'Fable', gender: 'female', provider: 'openai', preview: '/voices/fable.mp3' },
  { id: 'nova', name: 'Nova', gender: 'female', provider: 'openai', preview: '/voices/nova.mp3' },
  { id: 'rachel', name: 'Rachel', gender: 'female', provider: 'elevenlabs', preview: '/voices/rachel.mp3' },
  { id: 'adam', name: 'Adam', gender: 'male', provider: 'elevenlabs', preview: '/voices/adam.mp3' },
  { id: 'bella', name: 'Bella', gender: 'female', provider: 'elevenlabs', preview: '/voices/bella.mp3' },
];

// Build stages
const buildStages = [
  { stage: 'analyzing', progress: 15, text: 'Analyzing conversation requirements...' },
  { stage: 'voice_selection', progress: 30, text: 'Configuring voice settings...' },
  { stage: 'flow_design', progress: 50, text: 'Designing conversation flow...' },
  { stage: 'training', progress: 70, text: 'Training voice responses...' },
  { stage: 'testing', progress: 85, text: 'Testing voice quality...' },
  { stage: 'complete', progress: 100, text: 'Voice agent forged!' }
];

export default function VoiceBuildPage() {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'describe' | 'voice' | 'building' | 'complete'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof voiceAgentTemplates[0] | null>(null);
  const [description, setDescription] = useState('');
  const [agentName, setAgentName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(voiceOptions[0]);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [buildStatus, setBuildStatus] = useState<typeof buildStages[0] | null>(null);
  const [builtAgent, setBuiltAgent] = useState<any>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    backchannel: true,
    interruption: 'medium',
    greetingMessage: 'Hello! Thank you for calling. How can I help you today?',
    maxCallDuration: 30, // minutes
    silenceTimeout: 10, // seconds
  });

  const handleSelectTemplate = (template: typeof voiceAgentTemplates[0]) => {
    setSelectedTemplate(template);
    setDescription('');
    setAgentName(template.id === 'voice_custom' ? '' : `My ${template.name}`);
    setStep('describe');
  };

  const handleContinueToVoice = () => {
    if (!description.trim() || !agentName.trim()) return;
    setStep('voice');
  };

  const handleBuild = async () => {
    setStep('building');

    // Simulate build process
    for (let i = 0; i < buildStages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 900));
      setBuildStatus(buildStages[i]);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Create the voice agent object
    const agent = {
      id: `voice-agent-${Date.now()}`,
      name: agentName,
      type: selectedTemplate?.id || 'voice_custom',
      description: description,
      voice: {
        id: selectedVoice.id,
        name: selectedVoice.name,
        provider: selectedVoice.provider,
        speed: voiceSpeed,
        settings: voiceSettings,
      },
      status: 'ready',
      isVoice: true,
      createdAt: new Date().toISOString()
    };

    // Store in localStorage
    localStorage.setItem('pendingVoiceAgent', JSON.stringify(agent));

    setBuiltAgent(agent);
    setStep('complete');
  };

  const handleChoosePlan = () => {
    router.push('/pricing?from=voice-build');
  };

  const playVoicePreview = async () => {
    if (isPlayingVoice) return;
    setIsPlayingVoice(true);

    try {
      // Use OpenAI TTS API for human-like voice quality
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceSettings.greetingMessage,
          voice: selectedVoice.id,
          speed: voiceSpeed,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS API failed');
      }

      // Play the high-quality audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS API error, falling back to browser TTS:', error);
      // Fallback to browser TTS if OpenAI API fails
      try {
        const utterance = new SpeechSynthesisUtterance(voiceSettings.greetingMessage);
        utterance.rate = voiceSpeed;
        utterance.onend = () => setIsPlayingVoice(false);
        utterance.onerror = () => setIsPlayingVoice(false);
        window.speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error('Browser TTS fallback also failed:', fallbackError);
        setIsPlayingVoice(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48"
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
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25"
                whileHover={{ scale: 1.05 }}
              >
                <Phone className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold">Voice Agent Builder</h1>
                <p className="text-xs text-white/50">AI Voice Agents in Minutes</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/build" className="text-white/70 hover:text-white transition flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Text Agent Builder
              </Link>
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <PhoneCall className="w-4 h-4" />
                  Build AI Phone Agents
                </motion.div>
                <h1 className="text-4xl font-bold mb-4">What kind of voice agent do you need?</h1>
                <p className="text-xl text-white/60">Handle phone calls with AI that sounds human</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {voiceAgentTemplates.map((template, i) => (
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
                    <p className="text-white/60 text-sm mb-4">{template.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {template.features.map((feature, fi) => (
                        <span key={fi} className="px-2 py-1 rounded-full bg-white/5 text-white/50 text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
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
                <p className="text-white/60">Describe how your agent should handle calls</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="My Voice Agent"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Describe how your agent should handle calls
                    <span className="text-white/40 font-normal ml-2">(The more detail, the better)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={selectedTemplate.placeholder}
                    className="w-full h-48 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Greeting Message</label>
                  <input
                    type="text"
                    value={voiceSettings.greetingMessage}
                    onChange={(e) => setVoiceSettings({...voiceSettings, greetingMessage: e.target.value})}
                    placeholder="Hello! How can I help you today?"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition"
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
                    onClick={handleContinueToVoice}
                    disabled={!description.trim() || !agentName.trim()}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRight className="w-5 h-5" />
                    Choose Voice
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Voice Selection */}
          {step === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                onClick={() => setStep('describe')}
                className="flex items-center gap-2 text-white/60 hover:text-white transition mb-8"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to description
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-purple-500/20 items-center justify-center mb-4">
                  <Mic className="w-8 h-8 text-purple-400" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Choose a voice</h1>
                <p className="text-white/60">Select how your agent sounds on calls</p>
              </div>

              {/* Voice Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {voiceOptions.map((voice) => (
                  <motion.button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      selectedVoice.id === voice.id
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{voice.name}</span>
                      {selectedVoice.id === voice.id && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50 capitalize">{voice.gender}</span>
                      <span className="text-xs text-white/30">|</span>
                      <span className="text-xs text-white/50 capitalize">{voice.provider}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Voice Preview */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Preview Voice</span>
                  </div>
                  <motion.button
                    onClick={playVoicePreview}
                    disabled={isPlayingVoice}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isPlayingVoice ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Play Sample
                      </>
                    )}
                  </motion.button>
                </div>
                <p className="text-white/60 text-sm italic">
                  "{voiceSettings.greetingMessage}"
                </p>
              </div>

              {/* Voice Settings */}
              <div className="space-y-4 mb-8">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4 text-white/50" />
                  Voice Settings
                </h3>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Speaking Speed: {voiceSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div>
                    <p className="text-white text-sm">Back-channeling</p>
                    <p className="text-white/50 text-xs">Say "uh-huh", "I see" while listening</p>
                  </div>
                  <button
                    onClick={() => setVoiceSettings({...voiceSettings, backchannel: !voiceSettings.backchannel})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      voiceSettings.backchannel ? 'bg-purple-500' : 'bg-white/20'
                    }`}
                  >
                    <motion.div
                      className="w-5 h-5 rounded-full bg-white shadow-sm"
                      animate={{ x: voiceSettings.backchannel ? 24 : 2 }}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Interruption Handling</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setVoiceSettings({...voiceSettings, interruption: level})}
                        className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                          voiceSettings.interruption === level
                            ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/30'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    How quickly the agent responds when interrupted
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={() => setStep('describe')}
                  className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft className="w-5 h-5 inline mr-2" />
                  Back
                </motion.button>
                <motion.button
                  onClick={handleBuild}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone className="w-5 h-5" />
                  Forge Voice Agent
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Building */}
          {step === 'building' && buildStatus && (
            <motion.div
              key="building"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-16"
            >
              <motion.div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-500/30"
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 20px 40px rgba(168, 85, 247, 0.3)",
                    "0 20px 60px rgba(168, 85, 247, 0.5)",
                    "0 20px 40px rgba(168, 85, 247, 0.3)"
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
                  <Phone className="w-16 h-16 text-white" />
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
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${buildStatus.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-white/50 text-sm mt-2">{buildStatus.progress}%</p>
              </div>
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

              <h1 className="text-4xl font-bold mb-2">Your voice agent is ready!</h1>
              <p className="text-xl text-white/60 mb-8">{builtAgent.name} is ready to take calls</p>

              {/* Agent Preview Card */}
              <motion.div
                className="max-w-md mx-auto mb-8 p-6 rounded-2xl bg-white/5 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-white">{builtAgent.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-sm">Voice: {builtAgent.voice.name}</span>
                      <span className="text-white/30">|</span>
                      <span className="text-white/50 text-sm">{builtAgent.voice.speed}x speed</span>
                    </div>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm border border-green-500/30">
                    Ready
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                  <Volume2 className="w-4 h-4" />
                  <span>Greeting: "{builtAgent.voice.settings.greetingMessage}"</span>
                </div>
                <p className="text-white/60 text-sm text-left line-clamp-2 mb-4">{builtAgent.description}</p>

                {/* Test Voice Button */}
                <motion.button
                  onClick={playVoicePreview}
                  disabled={isPlayingVoice}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition border border-purple-500/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isPlayingVoice ? (
                    <>
                      <Volume2 className="w-5 h-5 animate-pulse" />
                      Speaking...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Test Voice Agent
                    </>
                  )}
                </motion.button>
              </motion.div>

              {/* Next Steps */}
              <motion.div
                className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <PhoneCall className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Get a phone number</h3>
                <p className="text-white/70 text-sm mb-6">
                  Choose a plan to get a phone number and start receiving calls.
                </p>
                <motion.button
                  onClick={handleChoosePlan}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                  whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowRight className="w-5 h-5" />
                  View Pricing Plans
                </motion.button>
                <p className="text-white/50 text-xs mt-3">
                  Voice plans start at $79/month + usage
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
                Build another voice agent
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

```

## app/dashboard/page.tsx

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Bot, MessageSquare, BarChart3, Star, Plus, X,
  Settings, ChevronRight, Activity, Clock, Sparkles, Copy,
  Check, Play, Pause, LogOut, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile, getAgents, updateAgent, signOut, savePendingAgentToDb } from '@/lib/auth';
import type { Profile, Agent } from '@/lib/supabase';
import VoiceAssistant from '@/components/VoiceAssistant';

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

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

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
      } catch (error) {
        console.error('Failed to load data:', error);
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
                          <Link href="/billing" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition">
                            <CreditCard className="w-4 h-4 text-white/50" />
                            <span className="text-white/70">Billing</span>
                          </Link>
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

      {/* Voice Assistant */}
      <VoiceAssistant
        userName={profile?.name?.split(' ')[0]}
        onNavigate={(path) => router.push(path)}
        autoGreet={true}
      />

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

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, trend }: { title: string; value: string | number; icon: any; color: string; trend: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    yellow: 'from-yellow-500 to-orange-500'
  };

  return (
    <motion.div className="relative p-5 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group" variants={fadeInUp} whileHover={{ y: -4 }}>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-white/40 text-xs">{trend}</div>
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/50">{title}</p>
      </div>
    </motion.div>
  );
}

// Agent Card Component
function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      className="relative p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 cursor-pointer group overflow-hidden"
      whileHover={{ y: -4 }}
    >
      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{agent.name}</h3>
            <p className="text-xs text-white/50 capitalize">{agent.type.replace('_', ' ')}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            agent.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {agent.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
            {agent.status === 'live' ? 'Live' : 'Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{(agent.conversations || 0).toLocaleString()}</p>
            <p className="text-white/40 text-xs">conversations</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-white font-medium">{agent.satisfaction || 0}%</p>
            <p className="text-white/40 text-xs">satisfaction</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {agent.last_active ? new Date(agent.last_active).toLocaleDateString() : 'Just created'}
          </span>
          <span className="text-orange-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

```

## app/login/page.tsx

```typescript
'use client';

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, ArrowRight, Loader2, Github, Chrome } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signUp, signInWithOAuth } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = searchParams.get('redirect') || '/dashboard';
  const action = searchParams.get('action');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError('');
    try {
      await signInWithOAuth(provider);
      // OAuth redirects automatically, no need to handle
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500/20 via-red-500/10 to-purple-500/20 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-[600px] h-[600px] bg-orange-500/30 rounded-full blur-3xl -top-48 -left-48"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-3xl -bottom-48 -right-48"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 15, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Agent Forge</span>
          </Link>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-4">
            Build AI agents that
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent"> work for you</span>
          </h2>
          <p className="text-xl text-white/70">
            Join thousands of businesses automating their customer interactions with intelligent AI agents.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8">
          <div>
            <p className="text-3xl font-bold">2,500+</p>
            <p className="text-white/60">Active agents</p>
          </div>
          <div>
            <p className="text-3xl font-bold">10M+</p>
            <p className="text-white/60">Conversations</p>
          </div>
          <div>
            <p className="text-3xl font-bold">99.9%</p>
            <p className="text-white/60">Uptime</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>

          {/* Action message */}
          {action && (
            <motion.div
              className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-orange-400 text-sm">
                {action === 'deploy'
                  ? 'Sign in to deploy your agent and make it live!'
                  : 'Sign in to save your agent to your account.'}
              </p>
            </motion.div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-white/60">
              {isLogin
                ? 'Sign in to access your agents'
                : 'Start building AI agents for free'}
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <motion.button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition flex items-center justify-center gap-3 disabled:opacity-50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Chrome className="w-5 h-5" />
              Continue with Google
            </motion.button>
            <motion.button
              onClick={() => handleOAuth('github')}
              disabled={loading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition flex items-center justify-center gap-3 disabled:opacity-50"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </motion.button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-950 text-white/40">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-orange-400 hover:text-orange-300 transition">
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
              whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-white/60">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-400 hover:text-orange-300 transition font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p className="mt-8 text-center text-white/40 text-xs">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-white/60 hover:text-white transition">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-white/60 hover:text-white transition">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );
}

// Main export wrapped in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}

```

## app/pricing/page.tsx

```typescript
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Check, Flame, Zap, Crown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser } from '@/lib/auth';
import config from '@/config.json';

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

    // Load plans from config.json (single source of truth)
    const configPlans = config.pricing.plans;
    setPlans({
      starter: {
        name: configPlans.starter.name,
        price: configPlans.starter.price,
        interval: configPlans.starter.interval,
        agents: configPlans.starter.agents,
        features: configPlans.starter.features
      },
      professional: {
        name: configPlans.professional.name,
        price: configPlans.professional.price,
        interval: configPlans.professional.interval,
        agents: configPlans.professional.agents,
        features: configPlans.professional.features
      },
      enterprise: {
        name: configPlans.enterprise.name,
        price: configPlans.enterprise.price,
        interval: configPlans.enterprise.interval,
        agents: configPlans.enterprise.agents,
        features: configPlans.enterprise.features
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

```

## app/api/tts/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI TTS voices - these sound very natural
const VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
  'alloy': 'alloy',     // Neutral, balanced
  'echo': 'echo',       // Male, warm
  'fable': 'fable',     // Female, British accent
  'nova': 'nova',       // Female, warm and engaging
  'rachel': 'nova',     // Map to nova (similar to ElevenLabs Rachel)
  'adam': 'onyx',       // Map to onyx (deep male voice)
  'bella': 'shimmer',   // Map to shimmer (expressive female)
};

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Get the OpenAI voice name
    const openaiVoice = VOICE_MAP[voice] || 'nova';

    // Generate speech using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // High quality model
      voice: openaiVoice,
      input: text,
      speed: Math.min(Math.max(speed || 1.0, 0.25), 4.0), // Clamp speed between 0.25 and 4.0
    });

    // Get the audio as an ArrayBuffer
    const audioBuffer = await mp3Response.arrayBuffer();

    // Return the audio as MP3
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

```

## app/api/checkout/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Price IDs from your Stripe dashboard
const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, userId, userEmail, pendingAgentId } = body;

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://agent-forge.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://agent-forge.app'}/pricing?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId || '',
        plan,
        pendingAgentId: pendingAgentId || '',
      },
      subscription_data: {
        metadata: {
          userId: userId || '',
          plan,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

```

## app/api/webhooks/stripe/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/emailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper to get customer details
async function getCustomerDetails(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return {
      email: customer.email || '',
      name: customer.name || 'there',
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

// Helper to format plan name
function formatPlanName(plan: string): string {
  const planNames: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  return planNames[plan.toLowerCase()] || plan;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get customer details
        const customerDetails = await getCustomerDetails(session.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        const plan = session.metadata?.plan || 'unknown';
        const formattedPlan = formatPlanName(plan);

        // Send welcome email
        await sendWelcomeEmail(
          customerDetails.email,
          customerDetails.name,
          formattedPlan
        );

        console.log(`Welcome email sent to ${customerDetails.email} for ${formattedPlan} plan`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get customer details
        const customerDetails = await getCustomerDetails(invoice.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        // Get subscription to retrieve plan metadata
        let plan = 'Subscription';
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId as string
            );
            plan = formatPlanName((subscription as any).metadata?.plan || 'subscription');
          } catch (error) {
            console.error('Error fetching subscription:', error);
          }
        }

        // Send payment success email
        await sendPaymentSuccessEmail(
          customerDetails.email,
          customerDetails.name,
          invoice.amount_paid,
          plan,
          invoice.hosted_invoice_url || undefined
        );

        console.log(`Payment success email sent to ${customerDetails.email}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Get customer details
        const customerDetails = await getCustomerDetails(invoice.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        // Get subscription to retrieve plan metadata
        let plan = 'Subscription';
        let retryDate: string | undefined;

        const failedSubId = (invoice as any).subscription;
        if (failedSubId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              failedSubId as string
            );
            plan = formatPlanName((subscription as any).metadata?.plan || 'subscription');

            // Calculate next retry date if available
            if (invoice.next_payment_attempt) {
              retryDate = new Date(invoice.next_payment_attempt * 1000).toLocaleDateString();
            }
          } catch (error) {
            console.error('Error fetching subscription:', error);
          }
        }

        // Send payment failed email
        await sendPaymentFailedEmail(
          customerDetails.email,
          customerDetails.name,
          invoice.amount_due,
          plan,
          retryDate
        );

        console.log(`Payment failed email sent to ${customerDetails.email}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Get customer details
        const customerDetails = await getCustomerDetails(subscription.customer as string);
        if (!customerDetails) {
          console.error('Could not retrieve customer details');
          break;
        }

        const plan = formatPlanName((subscription as any).metadata?.plan || 'subscription');
        const endDate = new Date((subscription as any).current_period_end * 1000).toLocaleDateString();

        // Send subscription canceled email
        await sendSubscriptionCanceledEmail(
          customerDetails.email,
          customerDetails.name,
          plan,
          endDate
        );

        console.log(`Subscription canceled email sent to ${customerDetails.email}`);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`New subscription created: ${subscription.id}`);
        // Additional logic can be added here (e.g., update database)
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription updated: ${subscription.id}`);
        // Additional logic can be added here (e.g., handle plan changes)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

```

## components/VoiceAssistant.tsx

```typescript
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2 } from 'lucide-react';

interface VoiceAssistantProps {
  userName?: string;
  onNavigate?: (destination: string) => void;
  autoGreet?: boolean;
}

type ListeningState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function VoiceAssistant({ userName, onNavigate, autoGreet = true }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ListeningState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Speak text using TTS API with fallback to browser
  const speak = useCallback(async (text: string) => {
    if (isMuted) return;

    setState('speaking');
    setResponse(text);

    try {
      // Try OpenAI TTS first
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'nova',
          speed: 1.0,
        }),
      });

      if (res.ok) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setState('listening');
          URL.revokeObjectURL(audioUrl);
          startListening();
        };

        audio.onerror = () => {
          setState('listening');
          URL.revokeObjectURL(audioUrl);
          startListening();
        };

        await audio.play();
        return;
      }
    } catch (error) {
      console.log('OpenAI TTS unavailable, using browser TTS');
    }

    // Fallback to browser TTS
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setState('listening');
      startListening();
    };

    utterance.onerror = () => {
      setState('listening');
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Initialize speech recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        handleVoiceCommand(finalTranscript.toLowerCase().trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setState('idle');
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in listening mode
      if (state === 'listening' && isOpen && !isMuted) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // Already started
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      // Already started
    }
  }, [state, isOpen, isMuted]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    setState('processing');
    setTranscript(command);

    // Parse intent
    let responseText = '';

    if (command.includes('text') || command.includes('chat') || command.includes('chatbot')) {
      responseText = 'Great choice! I\'ll take you to the text agent builder. You can create chatbots for customer support, sales, or any other purpose.';
      setTimeout(() => onNavigate?.('/build'), 2000);
    } else if (command.includes('voice') || command.includes('call') || command.includes('phone')) {
      responseText = 'Perfect! Let\'s build a voice agent. I\'ll take you to the voice agent builder where you can create AI that handles phone calls.';
      setTimeout(() => onNavigate?.('/build/voice'), 2000);
    } else if (command.includes('support') || command.includes('customer')) {
      responseText = 'A customer support agent is a great choice! Let me take you to the builder where you can customize how your agent handles inquiries.';
      setTimeout(() => onNavigate?.('/build'), 2000);
    } else if (command.includes('sales')) {
      responseText = 'A sales agent can really boost your conversions! I\'ll take you to the builder to set up your AI sales assistant.';
      setTimeout(() => onNavigate?.('/build'), 2000);
    } else if (command.includes('help') || command.includes('what can you do')) {
      responseText = 'I can help you build AI agents! Just say "text agent" for chatbots, "voice agent" for phone calls, or tell me what kind of agent you need like "customer support" or "sales agent".';
    } else if (command.includes('close') || command.includes('bye') || command.includes('stop') || command.includes('quiet')) {
      responseText = 'Okay, I\'ll be here if you need me. Just click the microphone icon to talk again.';
      setTimeout(() => setIsOpen(false), 2000);
    } else {
      responseText = `I heard "${command}". Would you like to build a text agent for chat, or a voice agent for phone calls? Just say "text agent" or "voice agent".`;
    }

    speak(responseText);
  }, [speak, onNavigate]);

  // Stop everything
  const stopAll = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setState('idle');
  }, []);

  // Toggle assistant
  const toggleAssistant = useCallback(() => {
    if (isOpen) {
      stopAll();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setHasGreeted(false);
    }
  }, [isOpen, stopAll]);

  // Auto-greet when opened
  useEffect(() => {
    if (isOpen && !hasGreeted && autoGreet) {
      setHasGreeted(true);
      const greeting = userName
        ? `Welcome to Agent Forge, ${userName}! What kind of agent do you want to build today? You can say text agent for chatbots, or voice agent for phone calls.`
        : 'Welcome to Agent Forge! What kind of agent do you want to build today? You can say text agent for chatbots, or voice agent for phone calls.';

      setTimeout(() => speak(greeting), 500);
    }
  }, [isOpen, hasGreeted, autoGreet, userName, speak]);

  // Auto-open on first load
  useEffect(() => {
    if (autoGreet) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoGreet]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={toggleAssistant}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={state === 'listening' ? { boxShadow: ['0 0 0 0 rgba(249, 115, 22, 0.4)', '0 0 0 20px rgba(249, 115, 22, 0)'] } : {}}
        transition={state === 'listening' ? { duration: 1.5, repeat: Infinity } : {}}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    state === 'speaking' ? 'bg-blue-400 animate-pulse' :
                    state === 'listening' ? 'bg-green-400 animate-pulse' :
                    state === 'processing' ? 'bg-yellow-400 animate-pulse' :
                    'bg-white/30'
                  }`} />
                  <span className="text-white/70 text-sm font-medium">
                    {state === 'speaking' ? 'Speaking...' :
                     state === 'listening' ? 'Listening...' :
                     state === 'processing' ? 'Processing...' :
                     'Voice Assistant'}
                  </span>
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-white/50" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white/50" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 min-h-[120px]">
              {/* Visualization */}
              <div className="flex items-center justify-center mb-4">
                {state === 'listening' && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-orange-500 to-red-500 rounded-full"
                        animate={{
                          height: [8, 24, 8],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                )}
                {state === 'speaking' && (
                  <div className="flex items-center gap-1">
                    {[...Array(7)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-full"
                        animate={{
                          height: [4, 20, 4],
                        }}
                        transition={{
                          duration: 0.3,
                          repeat: Infinity,
                          delay: i * 0.05,
                        }}
                      />
                    ))}
                  </div>
                )}
                {state === 'processing' && (
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                )}
                {state === 'idle' && (
                  <Mic className="w-8 h-8 text-white/20" />
                )}
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="mb-3 p-2 rounded-lg bg-white/5">
                  <p className="text-white/50 text-xs mb-1">You said:</p>
                  <p className="text-white text-sm">{transcript}</p>
                </div>
              )}

              {/* Response */}
              {response && (
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-orange-400 text-xs mb-1">Assistant:</p>
                  <p className="text-white/80 text-sm">{response}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5 bg-white/5">
              <p className="text-white/40 text-xs text-center">
                {state === 'listening'
                  ? 'Speak now...'
                  : 'Say "text agent" or "voice agent" to get started'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

```

## components/voice/VoiceWidget.tsx

```typescript
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface VoiceWidgetConfig {
  agentId: string;
  apiKey: string;
  apiEndpoint?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  greeting?: string;
  title?: string;
  subtitle?: string;
  showTranscript?: boolean;
  enableMinimize?: boolean;
  autoExpand?: boolean;
  pulseAnimation?: boolean;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CallState {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'processing' | 'ended' | 'error';
  duration: number;
  callId?: string;
  errorMessage?: string;
}

// ============================================================================
// Voice Widget Component
// ============================================================================

export const VoiceWidget: React.FC<VoiceWidgetConfig> = ({
  agentId,
  apiKey,
  apiEndpoint = '/api/voice',
  position = 'bottom-right',
  theme = 'dark',
  primaryColor = '#6366f1',
  greeting = 'Hi! Click the button to start a voice conversation.',
  title = 'Voice Assistant',
  subtitle = 'Powered by Agent Forge',
  showTranscript = true,
  enableMinimize = true,
  autoExpand = false,
  pulseAnimation = true,
}) => {
  // State
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<CallState>({ status: 'idle', duration: 0 });
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Computed theme
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
  };

  // ============================================================================
  // Audio Processing
  // ============================================================================

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start audio level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current && callState.status !== 'idle' && callState.status !== 'ended') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      return stream;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }, [callState.status]);

  const cleanupAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  const connectWebSocket = useCallback(async () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}${apiEndpoint}/ws/${agentId}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      // Send authentication
      wsRef.current?.send(JSON.stringify({
        type: 'auth',
        apiKey,
        agentId
      }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setCallState(prev => ({ ...prev, status: 'error', errorMessage: 'Connection error' }));
    };

    wsRef.current.onclose = () => {
      if (callState.status !== 'idle' && callState.status !== 'ended') {
        setCallState(prev => ({ ...prev, status: 'ended' }));
      }
    };
  }, [apiEndpoint, agentId, apiKey, callState.status]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'authenticated':
        setCallState(prev => ({ ...prev, status: 'connected', callId: data.callId }));
        break;

      case 'transcript':
        setTranscript(prev => [...prev, {
          id: Date.now().toString(),
          role: data.role,
          content: data.text,
          timestamp: new Date()
        }]);
        break;

      case 'status':
        if (data.speaking) {
          setCallState(prev => ({ ...prev, status: 'speaking' }));
        } else if (data.processing) {
          setCallState(prev => ({ ...prev, status: 'processing' }));
        } else {
          setCallState(prev => ({ ...prev, status: 'listening' }));
        }
        break;

      case 'audio':
        // Handle incoming audio playback
        playAudio(data.audio);
        break;

      case 'error':
        setCallState(prev => ({ ...prev, status: 'error', errorMessage: data.message }));
        break;

      case 'ended':
        setCallState(prev => ({ ...prev, status: 'ended' }));
        break;
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      if (audioContextRef.current) {
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  // ============================================================================
  // Call Controls
  // ============================================================================

  const startCall = async () => {
    try {
      setCallState({ status: 'connecting', duration: 0 });
      setTranscript([]);

      await initializeAudio();
      await connectWebSocket();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start call:', error);
      setCallState({ status: 'error', duration: 0, errorMessage: 'Failed to start call' });
    }
  };

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    cleanupAudio();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setCallState(prev => ({ ...prev, status: 'ended' }));
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState.status) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'speaking': return 'Assistant speaking...';
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'ended': return 'Call ended';
      case 'error': return callState.errorMessage || 'Error';
      default: return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (callState.status) {
      case 'connected':
      case 'listening':
        return '#22c55e';
      case 'speaking':
        return primaryColor;
      case 'processing':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return isDark ? '#6b7280' : '#9ca3af';
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <AnimatePresence>
        {/* Floating Button */}
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              position: 'relative',
            }}
          >
            {/* Pulse animation */}
            {pulseAnimation && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: primaryColor,
                }}
              />
            )}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </motion.button>
        )}

        {/* Expanded Widget */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : 480
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              width: 360,
              background: isDark ? '#1f2937' : '#ffffff',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: isDark ? '#111827' : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: isDark ? '#f9fafb' : '#111827'
                }}>
                  {title}
                </h3>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  color: isDark ? '#9ca3af' : '#6b7280'
                }}>
                  {subtitle}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {enableMinimize && (
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      {isMinimized ? (
                        <path d="M19 13H5v-2h14v2z"/>
                      ) : (
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      )}
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    endCall();
                    setIsExpanded(false);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#9ca3af' : '#6b7280',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <>
                {/* Status Bar */}
                <div style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.div
                      animate={{ scale: callState.status === 'listening' ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 1, repeat: callState.status === 'listening' ? Infinity : 0 }}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: getStatusColor(),
                      }}
                    />
                    <span style={{
                      fontSize: 13,
                      color: isDark ? '#d1d5db' : '#4b5563'
                    }}>
                      {getStatusText()}
                    </span>
                  </div>
                  {(callState.status !== 'idle' && callState.status !== 'error') && (
                    <span style={{
                      fontSize: 13,
                      fontVariantNumeric: 'tabular-nums',
                      color: isDark ? '#9ca3af' : '#6b7280'
                    }}>
                      {formatDuration(callState.duration)}
                    </span>
                  )}
                </div>

                {/* Transcript Area */}
                {showTranscript && (
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}>
                    {transcript.length === 0 && callState.status === 'idle' && (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: isDark ? '#9ca3af' : '#6b7280',
                      }}>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ opacity: 0.5, marginBottom: 16 }}
                        >
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                        <p style={{ margin: 0, fontSize: 14 }}>{greeting}</p>
                      </div>
                    )}

                    {transcript.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: msg.role === 'user'
                            ? primaryColor
                            : (isDark ? '#374151' : '#e5e7eb'),
                          color: msg.role === 'user'
                            ? '#ffffff'
                            : (isDark ? '#f3f4f6' : '#1f2937'),
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}>
                          {msg.content}
                        </div>
                        <span style={{
                          fontSize: 10,
                          color: isDark ? '#6b7280' : '#9ca3af',
                          marginTop: 4,
                        }}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}

                {/* Audio Visualizer */}
                {(callState.status === 'connected' || callState.status === 'listening' || callState.status === 'speaking') && (
                  <div style={{
                    padding: '0 20px 16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 3,
                    height: 40,
                  }}>
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: callState.status === 'listening'
                            ? Math.max(4, audioLevel * 30 * Math.random())
                            : (callState.status === 'speaking' ? 15 + Math.sin(Date.now() / 100 + i) * 10 : 4),
                        }}
                        transition={{ duration: 0.1 }}
                        style={{
                          width: 3,
                          background: primaryColor,
                          borderRadius: 2,
                          minHeight: 4,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div style={{
                  padding: '16px 20px',
                  borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                }}>
                  {callState.status === 'idle' || callState.status === 'ended' || callState.status === 'error' ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startCall}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        border: 'none',
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 20px ${primaryColor}40`,
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </motion.button>
                  ) : (
                    <>
                      {/* Mute Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleMute}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          border: 'none',
                          background: isMuted ? '#ef4444' : (isDark ? '#374151' : '#e5e7eb'),
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isMuted ? '#ffffff' : (isDark ? '#d1d5db' : '#4b5563'),
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          {isMuted ? (
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                          ) : (
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          )}
                        </svg>
                      </motion.button>

                      {/* End Call Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={endCall}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                          <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                        </svg>
                      </motion.button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Embed Script Generator
// ============================================================================

export const generateEmbedScript = (config: VoiceWidgetConfig): string => {
  return `
<!-- Agent Forge Voice Widget -->
<script>
(function() {
  var config = ${JSON.stringify(config, null, 2)};

  var script = document.createElement('script');
  script.src = 'https://your-domain.com/voice-widget.js';
  script.async = true;
  script.onload = function() {
    window.AgentForgeVoice.init(config);
  };
  document.head.appendChild(script);
})();
</script>
  `.trim();
};

// ============================================================================
// Hook for programmatic control
// ============================================================================

export const useVoiceWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
};

export default VoiceWidget;

```

## lib/auth.ts

```typescript
import { createClient } from './supabase';
import type { Profile, Agent } from './supabase';

const supabase = createClient();

// ================================
// AUTH FUNCTIONS
// ================================

export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ================================
// PROFILE FUNCTIONS
// ================================

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  // Map subscription_tier to plan for backward compatibility
  if (data) {
    return { ...data, plan: data.subscription_tier || 'free' };
  }
  return data;
}

export async function updateProfile(updates: Partial<Profile>) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ================================
// AGENT FUNCTIONS
// ================================

export async function getAgents(): Promise<Agent[]> {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAgent(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAgent(agent: {
  name: string;
  type: string;
  description?: string;
  config?: Record<string, any>;
}): Promise<Agent> {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('agents')
    .insert({
      user_id: user.id,
      name: agent.name,
      type: agent.type,
      description: agent.description,
      config: agent.config || {},
      status: 'ready',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAgent(id: string) {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ================================
// PENDING AGENT (for try-before-buy flow)
// ================================

export function savePendingAgent(agent: {
  name: string;
  type: string;
  description?: string;
}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pendingAgent', JSON.stringify(agent));
  }
}

export function getPendingAgent(): { name: string; type: string; description?: string } | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('pendingAgent');
  return data ? JSON.parse(data) : null;
}

export function clearPendingAgent() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pendingAgent');
  }
}

// Save pending agent to database after auth
export async function savePendingAgentToDb(): Promise<Agent | null> {
  const pending = getPendingAgent();
  if (!pending) return null;

  try {
    const agent = await createAgent(pending);
    clearPendingAgent();
    return agent;
  } catch (error) {
    console.error('Failed to save pending agent:', error);
    return null;
  }
}

```

## lib/supabase.ts

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Types for our database
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'starter' | 'professional' | 'enterprise';
  // Alias for backward compatibility - use subscription_tier instead
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  description: string | null;
  status: 'ready' | 'live' | 'paused';
  config: Record<string, any> | null;
  conversations: number;
  satisfaction: number;
  response_time: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

```

