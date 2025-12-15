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
                  Build Free
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
              No credit card required - Build your first agent free
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
                  Start Building - It's Free
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
                  Start Building Free
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <p className="text-white/60 text-sm mt-4">No credit card required</p>
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
