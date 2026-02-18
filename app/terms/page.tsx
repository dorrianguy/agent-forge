'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Mail, AlertTriangle, CreditCard, Server, Scale, Ban } from 'lucide-react';
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

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12"
    >
      <h2 className="text-2xl font-bold text-white mb-4">
        <span className="text-orange-500">{number}.</span> {title}
      </h2>
      <div className="text-white/60 leading-relaxed space-y-4">{children}</div>
    </motion.div>
  );
}

export default function TermsPage() {
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
              <FileText className="w-4 h-4" />
              Legal
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-4">
              Terms of <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Service</span>
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
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Agent Forge platform and services (&quot;Service&quot;) provided by Agent Forge (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Service.
        </motion.p>

        <Section number="1" title="Acceptance of Terms">
          <p>
            By creating an account, accessing, or using Agent Forge, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link href="/privacy" className="text-orange-400 hover:text-orange-300 transition">Privacy Policy</Link>. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
          </p>
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be communicated via email or a prominent notice within the Service at least 30 days before taking effect. Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
          </p>
        </Section>

        <Section number="2" title="Service Description">
          <p>
            Agent Forge is an AI agent building platform that enables users to create, customize, deploy, and manage AI-powered conversational agents. The Service includes:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>An AI-powered agent builder with natural language configuration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>Agent hosting and deployment infrastructure</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>Multi-channel integration (web, Slack, Discord, WhatsApp, SMS, email, phone)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>Voice agent capabilities with phone number provisioning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>Analytics, conversation logs, and performance monitoring</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>REST API for programmatic access</span>
            </li>
          </ul>
        </Section>

        <Section number="3" title="Account Registration">
          <p>
            To use the Service, you must create an account by providing accurate, complete, and current information. You are responsible for:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>Maintaining the confidentiality of your account credentials</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>All activities that occur under your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
              <span>Notifying us immediately of any unauthorized use of your account</span>
            </li>
          </ul>
          <p>
            You must be at least 16 years old to create an account. Accounts registered by automated methods (bots) are not permitted and will be terminated.
          </p>
        </Section>

        <Section number="4" title="Acceptable Use">
          <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
            <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Prohibited Uses
            </h3>
            <p>You agree not to use the Service to:</p>
          </div>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <span><strong className="text-white">Create spam agents:</strong> Agents designed to send unsolicited messages, phishing attempts, or bulk marketing without consent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <span><strong className="text-white">Generate illegal content:</strong> Agents that produce content that violates applicable laws, including but not limited to hate speech, harassment, threats, or content that exploits minors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <span><strong className="text-white">Impersonate real people:</strong> Agents designed to deceive users into believing they are communicating with a specific real person</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <span><strong className="text-white">Circumvent safety measures:</strong> Attempts to bypass AI safety filters, content moderation, or security controls</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <span><strong className="text-white">Abuse rate limits:</strong> Exceeding API rate limits, creating excessive agents, or using the Service in a way that degrades performance for other users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <span><strong className="text-white">Distribute malware:</strong> Using agents to distribute viruses, malware, or other harmful code</span>
            </li>
          </ul>
          <p className="mt-4">
            We reserve the right to investigate and suspend or terminate accounts that violate these policies. Severe violations may be reported to law enforcement.
          </p>
        </Section>

        <Section number="5" title="Intellectual Property">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-2">Your Content</h3>
              <p className="text-sm">
                You retain all ownership rights to the agents you create, including system prompts, knowledge base content, and conversation data. We do not claim ownership of your content. By using the Service, you grant us a limited license to host, store, and process your content solely for the purpose of providing the Service.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-white/5">
              <h3 className="text-white font-semibold mb-2">Our Platform</h3>
              <p className="text-sm">
                The Agent Forge platform, including its software, design, branding, documentation, and underlying technology, is owned by Agent Forge and protected by intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the platform without our prior written consent.
              </p>
            </div>
          </div>
        </Section>

        <Section number="6" title="Payment Terms">
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 mb-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-white font-semibold mb-2">Subscription Billing</h3>
                <p className="text-sm">
                  Paid plans are billed on a monthly or annual basis, depending on your selection. Your subscription automatically renews at the end of each billing period unless you cancel before the renewal date. Prices are in US dollars and do not include applicable taxes, which will be added at checkout.
                </p>
              </div>
            </div>
          </div>
          <p>
            <strong className="text-white">Free Trial:</strong> New accounts receive a 14-day free trial with access to all features. No credit card is required to start a trial. If you do not select a paid plan before the trial ends, your account will be downgraded to the free tier with limited functionality.
          </p>
          <p>
            <strong className="text-white">Refunds:</strong> We offer a 7-day refund policy for new subscriptions. If you are not satisfied within the first 7 days of a new paid subscription, contact us for a full refund. Refunds are not available for renewal charges, usage overages, or after the 7-day window. Partial-month refunds are not provided for mid-cycle cancellations.
          </p>
          <p>
            <strong className="text-white">Price Changes:</strong> We may change our prices with 30 days&apos; notice. Price changes take effect at the start of your next billing period after the notice.
          </p>
        </Section>

        <Section number="7" title="Data and Privacy">
          <p>
            Your privacy is important to us. Our use of your data is governed by our <Link href="/privacy" className="text-orange-400 hover:text-orange-300 transition">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of information as described in the Privacy Policy.
          </p>
          <p>
            You are responsible for ensuring that your use of AI agents complies with applicable data protection laws (including GDPR, CCPA, and other local regulations) in the jurisdictions where your agents operate. This includes providing appropriate disclosures to end users that they are interacting with an AI agent.
          </p>
        </Section>

        <Section number="8" title="Service Availability">
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 mb-4">
            <div className="flex items-start gap-3">
              <Server className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-white font-semibold mb-2">Uptime Commitment</h3>
                <p className="text-sm">
                  We strive to maintain 99.9% uptime for the Service. Enterprise customers receive an SLA with uptime guarantees and service credits for qualifying downtime. Current uptime status is available at <span className="text-orange-400">status.agent-forge.app</span>.
                </p>
              </div>
            </div>
          </div>
          <p>
            <strong className="text-white">Scheduled Maintenance:</strong> We perform scheduled maintenance during low-traffic windows (typically Sundays 2:00–6:00 AM UTC). We will provide at least 48 hours&apos; notice for planned maintenance that may affect the Service. Emergency maintenance may occur without notice to address critical issues.
          </p>
          <p>
            <strong className="text-white">No Guarantee:</strong> While we work hard to maintain reliability, we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
          </p>
        </Section>

        <Section number="9" title="Limitation of Liability">
          <div className="p-5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, AGENT FORGE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, WHETHER IN AN ACTION IN CONTRACT, TORT, OR OTHERWISE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
                </p>
                <p className="text-sm mt-3">
                  OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                </p>
                <p className="text-sm mt-3">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT AI AGENT RESPONSES WILL BE ACCURATE, COMPLETE, OR ERROR-FREE.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section number="10" title="Termination">
          <p>
            <strong className="text-white">By You:</strong> You may terminate your account at any time from your dashboard settings or by contacting support. Upon termination, your access to the Service will end, and your data will be deleted in accordance with our <Link href="/privacy" className="text-orange-400 hover:text-orange-300 transition">Privacy Policy</Link>.
          </p>
          <p>
            <strong className="text-white">By Us:</strong> We may suspend or terminate your account if you violate these Terms, engage in prohibited activities, fail to pay applicable fees, or if we are required to do so by law. For non-critical violations, we will provide notice and a reasonable opportunity to cure the issue before termination.
          </p>
          <p>
            <strong className="text-white">Effect of Termination:</strong> Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days post-termination to allow you to export it, after which it will be permanently deleted.
          </p>
        </Section>

        <Section number="11" title="Governing Law">
          <div className="p-5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising from or related to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Wilmington, Delaware.
                </p>
                <p className="mt-3">
                  For disputes under $10,000, we agree to resolve them through binding arbitration administered by JAMS under its Simplified Arbitration Rules. For larger disputes, either party may elect litigation in the courts specified above.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section number="12" title="Changes to Terms">
          <p>
            We reserve the right to update these Terms at any time. Material changes will be communicated via email or a prominent notice within the Service at least 30 days before they take effect. Non-material changes (clarifications, formatting) may be made without notice.
          </p>
          <p>
            We encourage you to review these Terms periodically. Your continued use of the Service after changes take effect constitutes your acceptance of the revised Terms. If you do not agree with the updated Terms, you must stop using the Service and close your account.
          </p>
        </Section>

        <Section number="13" title="Contact Us">
          <p>If you have any questions about these Terms of Service, please contact us:</p>
          <div className="mt-4 p-5 rounded-xl bg-white/5 border border-white/5">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <strong className="text-white">Email:</strong>
                <a href="mailto:support@agent-forge.app" className="text-orange-400 hover:text-orange-300 transition">support@agent-forge.app</a>
              </p>
              <p className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-400" />
                <strong className="text-white">Subject:</strong>
                <span>Terms of Service Inquiry</span>
              </p>
            </div>
            <p className="mt-3 text-sm">We aim to respond to all inquiries within 5 business days.</p>
          </div>
        </Section>

      </div>

      <Footer />
    </div>
  );
}
