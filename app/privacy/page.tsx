'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, Cookie, UserCheck, Mail, AlertCircle } from 'lucide-react';
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12"
    >
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <div className="text-white/60 leading-relaxed space-y-4">{children}</div>
    </motion.div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />

      <Navbar />

      {/* Hero */}
      <section className="relative z-10 pt-16 pb-12 px-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm mb-6">
              <Shield className="w-4 h-4" />
              Legal
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-4">
              Privacy <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Policy</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-white/60">
              Last updated: February 14, 2026
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/60 leading-relaxed mb-12"
        >
          Agent Forge (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the agent-forge.app website and the Agent Forge platform (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
        </motion.p>

        <Section title="1. Information We Collect">
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-400" />
                Account Information
              </h3>
              <p>When you create an account, we collect your name, email address, password (hashed), and optionally your organization name and billing details. If you sign in via a third-party provider (Google, GitHub), we receive your basic profile information from that provider.</p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-400" />
                Usage Data
              </h3>
              <p>We automatically collect information about how you interact with the Service, including pages visited, features used, actions taken, browser type, operating system, IP address, device identifiers, and timestamps. This data helps us improve the Service and diagnose issues.</p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                Agent Data
              </h3>
              <p>When you create agents on our platform, we store your agent configurations, system prompts, knowledge base documents, customization settings, and deployment configurations. This data is necessary to operate the agents you build.</p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                Conversation Logs
              </h3>
              <p>We store conversations between your AI agents and their end users to provide analytics, enable conversation history features, and improve agent performance. Conversation logs include message content, timestamps, channel information, and user identifiers where provided.</p>
            </div>
          </div>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect for the following purposes:</p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To provide, operate, and maintain the Service</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To process your transactions and manage your subscription</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To send you technical notices, updates, security alerts, and support messages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To respond to your inquiries and provide customer support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To monitor and analyze usage trends and improve the Service</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To detect, prevent, and address fraud, abuse, and technical issues</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>To comply with legal obligations</span>
            </li>
          </ul>
        </Section>

        <Section title="3. Data Sharing">
          <div className="p-5 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 mb-4">
            <p className="text-green-400 font-semibold mb-2">We do not sell your personal data.</p>
            <p className="text-white/60">We will never sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
          </div>
          <p>We may share your information with the following categories of third parties:</p>
          <ul className="space-y-2 ml-4 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span><strong className="text-white">Service Providers:</strong> Third-party companies that help us operate the Service, including cloud hosting (AWS, Cloudflare), payment processing (Stripe), email delivery, and analytics providers. These providers only access data necessary to perform their functions and are contractually bound to protect it.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span><strong className="text-white">AI Model Providers:</strong> When your agents process conversations, message content is sent to the AI model provider you selected (e.g., OpenAI, Anthropic, Google). This is necessary to generate responses. We encourage you to review their privacy policies.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span><strong className="text-white">Legal Requirements:</strong> We may disclose your information if required by law, regulation, legal process, or government request.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span><strong className="text-white">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred. We will provide notice before your data is transferred and becomes subject to a different privacy policy.</span>
            </li>
          </ul>
        </Section>

        <Section title="4. Data Security">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <Lock className="w-5 h-5 text-orange-400 mb-3" />
              <h3 className="text-white font-semibold mb-2">Encryption</h3>
              <p className="text-sm">All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Database connections are encrypted and access is strictly controlled.</p>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <Shield className="w-5 h-5 text-orange-400 mb-3" />
              <h3 className="text-white font-semibold mb-2">SOC 2 Compliance</h3>
              <p className="text-sm">We maintain SOC 2 Type II compliance, demonstrating our commitment to security, availability, processing integrity, confidentiality, and privacy.</p>
            </div>
          </div>
          <p className="mt-4">
            We implement industry-standard security measures including access controls, audit logging, vulnerability scanning, and regular penetration testing. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account information for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except as required by law or for legitimate business purposes (e.g., fraud prevention).
          </p>
          <p>
            Conversation logs are retained based on your plan settings. By default, logs are retained for 90 days on Starter plans, 1 year on Growth plans, and configurable retention on Enterprise plans. You can delete conversation logs at any time from your dashboard.
          </p>
          <p>
            Agent configurations and knowledge base data are deleted within 30 days of account deletion or agent removal.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {[
              { title: 'Access', desc: 'Request a copy of the personal data we hold about you.' },
              { title: 'Deletion', desc: 'Request that we delete your personal data, subject to legal obligations.' },
              { title: 'Portability', desc: 'Receive your data in a structured, machine-readable format.' },
              { title: 'Correction', desc: 'Request correction of inaccurate or incomplete personal data.' },
              { title: 'Restriction', desc: 'Request that we limit the processing of your personal data.' },
              { title: 'Objection', desc: 'Object to the processing of your personal data for certain purposes.' },
            ].map((right) => (
              <div key={right.title} className="p-4 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-white font-medium mb-1">{right.title}</h4>
                <p className="text-sm">{right.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4">
            To exercise any of these rights, please contact us at <a href="mailto:support@agent-forge.app" className="text-orange-400 hover:text-orange-300 transition">support@agent-forge.app</a>. We will respond to your request within 30 days.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            We use cookies and similar tracking technologies to operate and improve the Service. The cookies we use include:
          </p>
          <ul className="space-y-2 ml-4 mt-3">
            <li className="flex items-start gap-2">
              <Cookie className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Essential Cookies:</strong> Required for the Service to function (authentication, session management, security). Cannot be disabled.</span>
            </li>
            <li className="flex items-start gap-2">
              <Cookie className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Analytics Cookies:</strong> Help us understand how you use the Service so we can improve it. You can opt out via your browser settings.</span>
            </li>
            <li className="flex items-start gap-2">
              <Cookie className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Preference Cookies:</strong> Remember your settings and preferences (theme, language, etc.).</span>
            </li>
          </ul>
          <p className="mt-3">
            We do not use advertising or third-party tracking cookies.
          </p>
        </Section>

        <Section title="8. Children&apos;s Privacy">
          <div className="p-5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
              <p>
                The Service is not intended for children under 16 years of age. We do not knowingly collect personal data from children under 16. If we become aware that we have collected personal data from a child under 16, we will delete that information promptly. If you believe a child under 16 has provided us with personal data, please contact us at <a href="mailto:support@agent-forge.app" className="text-orange-400 hover:text-orange-300 transition">support@agent-forge.app</a>.
              </p>
            </div>
          </div>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. For significant changes, we will provide notice via email or a prominent notice within the Service. Your continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
          <div className="mt-4 p-5 rounded-xl bg-white/5 border border-white/5">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <strong className="text-white">Email:</strong>
                <a href="mailto:support@agent-forge.app" className="text-orange-400 hover:text-orange-300 transition">support@agent-forge.app</a>
              </p>
              <p className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400" />
                <strong className="text-white">Subject:</strong>
                <span>Privacy Inquiry</span>
              </p>
            </div>
            <p className="mt-3 text-sm">We aim to respond to all privacy inquiries within 30 days.</p>
          </div>
        </Section>

      </div>

      <Footer />
    </div>
  );
}
