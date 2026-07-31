'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Rocket, Bot, Cloud, Code, Mic, Globe,
  MessageSquare, HelpCircle, ChevronRight, Terminal,
  Zap, Shield, Phone, Mail, Hash, Smartphone,
  Copy, Check, ArrowRight, Search, Menu, X,
  Puzzle, BarChart3, Key, Database, Webhook
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'agent-builder', label: 'Agent Builder', icon: Bot },
  { id: 'deployment', label: 'Deployment', icon: Cloud },
  { id: 'embed-widget', label: 'Embed Widget', icon: Code },
  { id: 'voice-agents', label: 'Voice Agents', icon: Mic },
  { id: 'api-reference', label: 'API Reference', icon: Terminal },
  { id: 'multi-channel', label: 'Multi-Channel', icon: Globe },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

function CodeBlock({ code, language = 'html' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden bg-slate-900 border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-xs text-white/40 font-mono">{language}</span>
        <button onClick={handleCopy} className="text-white/40 hover:text-white transition flex items-center gap-1 text-xs">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-white/80 font-mono">{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ id, icon: Icon, title, description }: { id: string; icon: React.ElementType; title: string; description: string }) {
  return (
    <div id={id} className="scroll-mt-24 mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-white/60 text-lg">{description}</p>
    </div>
  );
}

export default function DocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />

      <Navbar />

      {/* Hero */}
      <section className="relative z-10 pt-16 pb-12 px-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm mb-6">
              <BookOpen className="w-4 h-4" />
              Documentation
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-4">
              Build with <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Agent Forge</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-xl text-white/60 max-w-2xl mx-auto">
              Everything you need to create, deploy, and scale AI agents — from your first bot to enterprise rollout.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-12">

          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition text-sm group"
                >
                  <section.icon className="w-4 h-4 text-white/40 group-hover:text-orange-400 transition" />
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile sidebar */}
          {sidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl p-6 pt-24"
            >
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition text-base"
                  >
                    <section.icon className="w-5 h-5 text-orange-400" />
                    {section.label}
                  </a>
                ))}
              </nav>
            </motion.aside>
          )}

          {/* Content */}
          <main className="flex-1 min-w-0 space-y-20">

            {/* Getting Started */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="getting-started"
                icon={Rocket}
                title="Getting Started"
                description="Go from zero to a live AI agent in under 60 seconds."
              />
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {[
                  { step: '1', title: 'Describe Your Agent', desc: 'Tell Agent Forge what you need in plain English. "I need a customer support bot for my SaaS that knows our documentation and handles billing questions."' },
                  { step: '2', title: 'Customize & Test', desc: 'Fine-tune personality, tone, knowledge base, and capabilities. Test in our live preview before going live.' },
                  { step: '3', title: 'Deploy Anywhere', desc: 'One-click deploy to your website, Slack, Discord, WhatsApp, or via API. Your agent is live and ready to serve.' },
                ].map((item) => (
                  <motion.div
                    key={item.step}
                    variants={fadeInUp}
                    className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition"
                  >
                    <div className="text-4xl font-bold text-orange-500/30 mb-3">{item.step}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-white/60 text-sm">{item.desc}</p>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  Quick Start
                </h3>
                <p className="text-white/70 mb-4">
                  Sign up for a free account, describe your first agent, and deploy it — all within our guided builder. No credit card required for the 14-day trial.
                </p>
                <Link href="/login?action=build" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition font-medium">
                  Create your first agent <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.section>

            {/* Agent Builder */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="agent-builder"
                icon={Bot}
                title="Agent Builder"
                description="Our AI-powered builder turns your description into a fully functional agent."
              />

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-3">Natural Language Input</h3>
                  <p className="text-white/60 mb-4">
                    Describe your agent in plain English. Our AI understands context, intent, and nuance to generate the perfect agent configuration. You can specify:
                  </p>
                  <ul className="space-y-2 text-white/60">
                    {[
                      'Agent purpose and role (e.g., "Customer support for a SaaS product")',
                      'Personality and tone (e.g., "Professional but friendly")',
                      'Knowledge domains (e.g., "Our product docs, pricing, and FAQs")',
                      'Capabilities (e.g., "Can look up orders, process refunds, escalate to humans")',
                      'Boundaries (e.g., "Never make promises about features not yet released")',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-3">Customization Options</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: 'System Prompt', desc: 'Full control over the base instructions that define your agent\'s behavior.' },
                      { title: 'Knowledge Base', desc: 'Upload documents, URLs, or connect databases. Your agent learns from your data.' },
                      { title: 'Model Selection', desc: 'Choose from GPT-4o, Claude 3.5, Gemini, or bring your own model via API.' },
                      { title: 'Conversation Flow', desc: 'Define structured flows for common scenarios with fallback to free-form chat.' },
                      { title: 'Integrations', desc: 'Connect to your CRM, helpdesk, payment processor, and other tools.' },
                      { title: 'Branding', desc: 'Customize colors, avatar, name, and widget appearance to match your brand.' },
                    ].map((item) => (
                      <div key={item.title} className="p-4 rounded-xl bg-white/5">
                        <h4 className="text-white font-medium mb-1">{item.title}</h4>
                        <p className="text-white/50 text-sm">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-3">Testing & Preview</h3>
                  <p className="text-white/60">
                    Before deploying, test your agent with our live preview. Simulate real conversations, edge cases, and stress tests. View conversation logs, monitor responses in real-time, and iterate until your agent is production-ready. Every change is instantly reflected in the preview — no build steps required.
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Deployment */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="deployment"
                icon={Cloud}
                title="Deployment"
                description="One-click deployment to your preferred infrastructure."
              />

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[
                  { name: 'Cloudflare Workers', desc: 'Edge deployment in 300+ cities worldwide. Sub-50ms cold starts.', tag: 'Recommended' },
                  { name: 'Vercel', desc: 'Seamless integration with Next.js and the Vercel ecosystem.' },
                  { name: 'AWS Lambda', desc: 'Serverless deployment with full AWS ecosystem access.' },
                  { name: 'Railway', desc: 'Simple container-based deployment with automatic scaling.' },
                  { name: 'Docker', desc: 'Self-host with our official Docker image. Full control over your infrastructure.' },
                  { name: 'Agent Forge Cloud', desc: 'Zero-config managed hosting. We handle everything.', tag: 'Easiest' },
                ].map((platform) => (
                  <div key={platform.name} className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold">{platform.name}</h4>
                      {platform.tag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{platform.tag}</span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm">{platform.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-3">Deployment Process</h3>
                <ol className="space-y-3 text-white/60">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-sm flex items-center justify-center shrink-0 mt-0.5">1</span>
                    Select your target platform from the deployment dashboard.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-sm flex items-center justify-center shrink-0 mt-0.5">2</span>
                    Connect your account (one-time setup) or use Agent Forge Cloud.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-sm flex items-center justify-center shrink-0 mt-0.5">3</span>
                    Click deploy. Your agent is live in under 30 seconds.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-sm flex items-center justify-center shrink-0 mt-0.5">4</span>
                    Grab your embed code, API endpoint, or channel integration link.
                  </li>
                </ol>
              </div>
            </motion.section>

            {/* Embed Widget */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="embed-widget"
                icon={Code}
                title="Embed Widget (Preview)"
                description="Add your AI agent to any website with a single code snippet."
              />

              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-sm">
                  Coming soon. The embed snippets below show the planned API. The widget script is not live yet — use the in-dashboard test chat for now.
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Embed</h3>
                  <p className="text-white/60 mb-4">
                    Copy and paste this snippet into your website&apos;s HTML, just before the closing <code className="text-orange-400 bg-white/5 px-1.5 py-0.5 rounded text-sm">&lt;/body&gt;</code> tag:
                  </p>
                  <CodeBlock
                    language="html"
                    code={`<!-- Agent Forge Widget -->
<script
  src="https://cdn.agent-forge.app/widget.js"
  data-agent-id="YOUR_AGENT_ID"
  data-theme="dark"
  data-position="bottom-right"
  async
></script>`}
                  />
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">React Component</h3>
                  <p className="text-white/60 mb-4">
                    For React/Next.js apps, use our npm package for tighter integration:
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`npm install @agent-forge/react`}
                  />
                  <div className="mt-4">
                    <CodeBlock
                      language="tsx"
                      code={`import { AgentWidget } from '@agent-forge/react';

export default function App() {
  return (
    <div>
      <h1>My App</h1>
      <AgentWidget
        agentId="YOUR_AGENT_ID"
        theme="dark"
        position="bottom-right"
        greeting="Hi! How can I help you today?"
      />
    </div>
  );
}`}
                    />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-3">Widget Options</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { opt: 'data-theme', desc: '"light" | "dark" | "auto" — match your site\'s theme' },
                      { opt: 'data-position', desc: '"bottom-right" | "bottom-left" — widget placement' },
                      { opt: 'data-color', desc: 'Hex color for the widget accent (e.g., "#f97316")' },
                      { opt: 'data-greeting', desc: 'Initial message shown to users' },
                      { opt: 'data-avatar', desc: 'URL for a custom agent avatar image' },
                      { opt: 'data-fullscreen', desc: '"true" to launch in fullscreen mode' },
                    ].map((item) => (
                      <div key={item.opt} className="p-3 rounded-lg bg-white/5">
                        <code className="text-orange-400 text-sm">{item.opt}</code>
                        <p className="text-white/50 text-xs mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Voice Agents */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="voice-agents"
                icon={Mic}
                title="Voice Agents"
                description="Build voice-enabled AI agents with phone integration."
              />

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-orange-400" />
                    LiveKit Integration
                  </h3>
                  <p className="text-white/70 mb-4">
                    Agent Forge uses LiveKit for real-time voice communication. Our integration provides ultra-low latency voice interactions, making your AI agents sound natural and responsive.
                  </p>
                  <ul className="space-y-2 text-white/60">
                    {[
                      'Sub-200ms round-trip latency for natural conversation flow',
                      'WebRTC-based — works in any modern browser, no plugins needed',
                      'Automatic echo cancellation and noise suppression',
                      'Scalable to thousands of concurrent voice sessions',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-3">Dedicated Phone Numbers</h3>
                    <p className="text-white/60 mb-3">
                      Every voice agent gets a dedicated phone number. Customers can call your AI agent directly — no app downloads, no website visits required.
                    </p>
                    <ul className="space-y-2 text-white/50 text-sm">
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> US, UK, CA, and 40+ country numbers available</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> Toll-free and local number options</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> Port your existing numbers</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> Batch outbound calling campaigns</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-3">Text-to-Speech (TTS)</h3>
                    <p className="text-white/60 mb-3">
                      Give your agent a unique voice. Choose from 100+ natural-sounding voices or clone a custom voice.
                    </p>
                    <ul className="space-y-2 text-white/50 text-sm">
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> ElevenLabs, OpenAI, and Google TTS support</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> Custom voice cloning (Enterprise plan)</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> Multi-language support (30+ languages)</li>
                      <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-orange-400 mt-1 shrink-0" /> Emotion-aware speech synthesis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* API Reference */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="api-reference"
                icon={Terminal}
                title="API Reference"
                description="Full REST API for programmatic control over your agents."
              />

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Key className="w-5 h-5 text-orange-400" />
                    Authentication
                  </h3>
                  <p className="text-white/60 mb-4">
                    All API requests require a Bearer token. Generate API keys from your dashboard under <strong className="text-white">Settings → API Keys</strong>.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`curl https://api.agent-forge.app/v1/agents \\
  -H "Authorization: Bearer af_sk_your_api_key" \\
  -H "Content-Type: application/json"`}
                  />
                  <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 shrink-0" />
                      Never expose API keys in client-side code. Use server-side requests or environment variables.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">Base URL</h3>
                  <CodeBlock
                    language="text"
                    code="https://api.agent-forge.app/v1"
                  />
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">Endpoints</h3>
                  <div className="space-y-3">
                    {[
                      { method: 'GET', path: '/agents', desc: 'List all agents in your workspace' },
                      { method: 'POST', path: '/agents', desc: 'Create a new agent' },
                      { method: 'GET', path: '/agents/:id', desc: 'Get agent details and configuration' },
                      { method: 'PATCH', path: '/agents/:id', desc: 'Update agent settings' },
                      { method: 'DELETE', path: '/agents/:id', desc: 'Delete an agent' },
                      { method: 'POST', path: '/agents/:id/conversations', desc: 'Start a new conversation' },
                      { method: 'GET', path: '/agents/:id/conversations', desc: 'List conversations' },
                      { method: 'GET', path: '/agents/:id/conversations/:cid', desc: 'Get conversation history' },
                      { method: 'POST', path: '/agents/:id/conversations/:cid/messages', desc: 'Send a message' },
                      { method: 'GET', path: '/agents/:id/analytics', desc: 'Get agent analytics and metrics' },
                      { method: 'GET', path: '/agents/:id/analytics/conversations', desc: 'Conversation volume and trends' },
                      { method: 'GET', path: '/agents/:id/analytics/satisfaction', desc: 'Customer satisfaction scores' },
                    ].map((endpoint) => (
                      <div key={endpoint.method + endpoint.path} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                          endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                          endpoint.method === 'PATCH' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-white/80 text-sm font-mono">{endpoint.path}</code>
                        <span className="text-white/40 text-sm ml-auto hidden md:block">{endpoint.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">Example: Create an Agent</h3>
                  <CodeBlock
                    language="bash"
                    code={`curl -X POST https://api.agent-forge.app/v1/agents \\
  -H "Authorization: Bearer af_sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Support Bot",
    "description": "Customer support agent for Acme Inc",
    "model": "gpt-4o",
    "systemPrompt": "You are a helpful customer support agent for Acme Inc...",
    "temperature": 0.7,
    "channels": ["web", "slack"],
    "knowledgeBase": ["kb_doc_123", "kb_url_456"]
  }'`}
                  />
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">Webhooks</h3>
                  <p className="text-white/60 mb-3">
                    Subscribe to real-time events via webhooks. Configure webhook URLs in your dashboard.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { event: 'conversation.started', desc: 'New conversation begins' },
                      { event: 'conversation.ended', desc: 'Conversation is closed' },
                      { event: 'message.received', desc: 'User sends a message' },
                      { event: 'message.sent', desc: 'Agent sends a response' },
                      { event: 'escalation.requested', desc: 'Agent requests human handoff' },
                      { event: 'agent.deployed', desc: 'Agent deployment completes' },
                    ].map((wh) => (
                      <div key={wh.event} className="p-3 rounded-lg bg-white/5 flex items-center gap-3">
                        <Webhook className="w-4 h-4 text-orange-400 shrink-0" />
                        <div>
                          <code className="text-white/80 text-xs font-mono">{wh.event}</code>
                          <p className="text-white/40 text-xs">{wh.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Multi-Channel */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="multi-channel"
                icon={Globe}
                title="Multi-Channel Deployment"
                description="Deploy your agent across every channel your customers use."
              />

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Web', icon: Globe, desc: 'Embed widget on any website. Customizable theme, position, and branding.', status: 'Available' },
                  { name: 'Slack', icon: Hash, desc: 'Install as a Slack app. Your agent responds in channels or DMs.', status: 'Available' },
                  { name: 'Discord', icon: MessageSquare, desc: 'Add as a Discord bot. Works in servers and threads.', status: 'Available' },
                  { name: 'WhatsApp', icon: Smartphone, desc: 'Connect via WhatsApp Business API. Full rich message support.', status: 'Available' },
                  { name: 'SMS', icon: MessageSquare, desc: 'Text-based conversations via Twilio or Vonage integration.', status: 'Available' },
                  { name: 'Email', icon: Mail, desc: 'Auto-respond to support emails. Integrates with your inbox.', status: 'Available' },
                ].map((channel) => (
                  <motion.div
                    key={channel.name}
                    variants={fadeInUp}
                    className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-orange-500/20 transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                        <channel.icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{channel.name}</h4>
                        <span className="text-xs text-green-400">{channel.status}</span>
                      </div>
                    </div>
                    <p className="text-white/50 text-sm">{channel.desc}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-3">Unified Inbox</h3>
                <p className="text-white/60">
                  All conversations from every channel flow into a single dashboard. See the full context of every customer interaction, regardless of which channel they started on. Agents maintain conversation history across channels — if a customer starts on your website and follows up on WhatsApp, your agent remembers everything.
                </p>
              </div>
            </motion.section>

            {/* FAQ */}
            <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeading
                id="faq"
                icon={HelpCircle}
                title="Frequently Asked Questions"
                description="Common questions about Agent Forge."
              />

              <div className="space-y-4">
                {[
                  {
                    q: 'Do I need coding experience to build an agent?',
                    a: 'No. Agent Forge is designed for non-technical users. Describe what you need in plain English, and our AI builds it for you. Developers can optionally use the API for advanced customization.',
                  },
                  {
                    q: 'How long does it take to create an agent?',
                    a: 'Most agents are live within 60 seconds. Describe your agent, review the generated configuration, and click deploy. More complex agents with custom knowledge bases may take a few minutes to index your data.',
                  },
                  {
                    q: 'What AI models do you support?',
                    a: 'We support GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3 Opus, Gemini 1.5 Pro, and more. Enterprise plans can bring their own API keys or fine-tuned models.',
                  },
                  {
                    q: 'Can I train my agent on my own data?',
                    a: 'Yes. Upload documents (PDF, DOCX, TXT), provide URLs to crawl, or connect databases. Your agent uses RAG (Retrieval Augmented Generation) to answer based on your data.',
                  },
                  {
                    q: 'Is my data secure?',
                    a: 'Absolutely. All data is encrypted at rest and in transit. We are SOC 2 Type II compliant. Your agent data and conversation logs are isolated and never used to train models.',
                  },
                  {
                    q: 'Can I use my own domain for the widget?',
                    a: 'Yes. Enterprise plans include white-label options with custom domains, branding removal, and CSS overrides.',
                  },
                  {
                    q: 'What happens if my agent can\'t answer a question?',
                    a: 'You can configure fallback behavior: escalate to a human agent, send an email notification, collect contact info for follow-up, or provide a custom fallback response.',
                  },
                  {
                    q: 'Do you offer a free trial?',
                    a: 'Yes. Every plan includes a 14-day free trial with full access to all features. No credit card required to start.',
                  },
                ].map((faq, i) => (
                  <details key={i} className="group p-5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <h3 className="text-white font-medium pr-4">{faq.q}</h3>
                      <ChevronRight className="w-5 h-5 text-white/40 group-open:rotate-90 transition-transform shrink-0" />
                    </summary>
                    <p className="mt-3 text-white/60 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-3xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600" />
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
              <div className="relative p-12 md:p-16 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to build your first agent?</h2>
                <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
                  Get started in under a minute. No credit card required.
                </p>
                <Link href="/login?action=build">
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
            </motion.section>

          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
