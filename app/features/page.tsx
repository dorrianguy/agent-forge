import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features | Agent Forge — No-Code AI Agent Builder with Voice & Phone',
  description: 'Build AI voice and text agents in minutes. Phone numbers, TTS voice cloning, multi-channel deployment, enterprise security, and real-time analytics — all without code.',
  openGraph: {
    title: 'Agent Forge Features — No-Code AI Agent Builder with Voice & Phone',
    description: 'Build AI voice and text agents in minutes. Phone numbers, TTS voice cloning, multi-channel deployment, enterprise security, and real-time analytics — all without code.',
    url: 'https://agent-forge.app/features',
  },
  alternates: {
    canonical: '/features',
  },
};

const features = [
  {
    icon: '🧠',
    title: 'AI-Powered Agent Builder',
    headline: 'Describe It. We Build It.',
    body: 'Tell Agent Forge what you need in plain English. Our AI analyzes your requirements, generates the agent logic, and creates a production-ready agent — in under 60 seconds.',
    points: [
      'Natural language agent creation — describe what you want, AI handles the rest',
      'Smart defaults — your agent comes pre-configured with best practices',
      'Instant preview — test your agent before deploying',
      'Iterative refinement — tweak behavior with plain English instructions',
    ],
  },
  {
    icon: '🎙️',
    title: 'Voice-First AI Agents',
    headline: 'AI Agents That Talk, Listen, and Call',
    body: "Agent Forge isn't just another chatbot platform. We're voice-first. Every agent you build can handle phone calls, speak naturally with customers, and operate across voice and text simultaneously.",
    points: [
      'Inbound & outbound voice calls with natural conversation',
      'Dedicated phone numbers included in every plan',
      'Voice minutes included — not a surprise add-on',
      'Seamless voice-to-text handoff within conversations',
    ],
  },
  {
    icon: '📞',
    title: 'Dedicated Phone Numbers',
    headline: 'Real Phone Numbers. Real Conversations.',
    body: 'Every Agent Forge plan includes dedicated phone numbers for your AI agents. Customers call a real number, talk to your AI agent, and get help instantly — 24/7/365.',
    points: [
      'Starter: 1 phone number included',
      'Professional: 5 phone numbers included',
      'Enterprise: Unlimited phone numbers',
    ],
  },
  {
    icon: '🗣️',
    title: 'Custom TTS Voice Cloning',
    headline: 'Your Brand. Your Voice. Literally.',
    body: "Enterprise customers can create custom AI voices that match their brand identity. Your AI agent doesn't have to sound like every other AI.",
    points: [
      'Custom voice creation from audio samples',
      'Adjustable tone, speed, and personality',
      'Consistent brand voice across all channels',
      'Available on Enterprise plan',
    ],
  },
  {
    icon: '🌐',
    title: 'Multi-Channel Deployment',
    headline: 'One Agent. Every Channel.',
    body: 'Build your agent once, deploy it everywhere — website, WhatsApp, Slack, Discord, SMS, email, and phone.',
    points: [
      'Single agent configuration serves all channels',
      'Channel-specific optimizations (voice for phone, rich media for web)',
      'Unified conversation history across channels',
      'Add new channels without rebuilding your agent',
    ],
  },
  {
    icon: '🔒',
    title: 'Enterprise Security',
    headline: 'Fortune 500 Security. Startup Speed.',
    body: 'SOC 2 compliant with end-to-end encryption, role-based access control, and full audit trails. Enterprise plan offers on-premise deployment.',
    points: [
      'SOC 2 Type II compliant',
      'End-to-end encryption (at rest and in transit)',
      'Role-based access control (RBAC)',
      'On-premise deployment option (Enterprise)',
      'No training on customer data — ever',
    ],
  },
  {
    icon: '📊',
    title: 'Real-Time Analytics',
    headline: 'Know Exactly How Your Agents Perform',
    body: 'Track every conversation, measure satisfaction, and optimize your agents with data — not guesses.',
    points: [
      'Total conversations and resolution rate',
      'Customer satisfaction scores (CSAT)',
      'Average response time',
      'Voice call duration and quality metrics',
      'Channel-by-channel performance breakdown',
    ],
  },
  {
    icon: '📞',
    title: 'Batch Calling Campaigns',
    headline: 'Outbound AI Calling at Scale',
    body: 'Launch automated outbound calling campaigns for sales outreach, appointment reminders, surveys, payment collection, and more.',
    points: [
      'Upload contact lists (CSV)',
      'Customizable call scripts with branching logic',
      'Scheduling and time-zone awareness',
      'Post-call analysis and transcription',
      'Available on Professional and Enterprise plans',
    ],
  },
  {
    icon: '🏷️',
    title: 'White-Label for Agencies',
    headline: 'Resell AI Agents Under Your Brand',
    body: "Digital agencies: build AI agents for your clients and deploy them under your own brand. Agent Forge's white-label option removes all branding.",
    points: [
      'Remove all Agent Forge branding',
      'Custom domain support',
      'Client workspace management',
      'Reseller pricing',
      'Available on Professional and Enterprise plans',
    ],
  },
  {
    icon: '⚡',
    title: 'One-Click Deployment',
    headline: 'Live in 60 Seconds. Seriously.',
    body: 'No staging environments. No deployment pipelines. No DevOps. Click deploy, and your agent is live.',
    points: [
      'Website: Copy-paste a single <script> tag',
      'Phone: Instant phone number activation',
      'Messaging: One-click channel connection',
      'API: Endpoint ready on deploy',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition">
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything You Need to Build AI Agents That Actually Work
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From AI-powered building to voice calls, multi-channel deployment to enterprise security — Agent Forge gives you the complete platform. No code. No engineers. No limits.
          </p>
        </div>

        <div className="space-y-24">
          {features.map((feature, index) => (
            <section key={index} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{feature.icon}</span>
                <span className="text-sm font-medium text-orange-500 uppercase tracking-wider">{feature.title}</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">{feature.headline}</h2>
              <p className="text-lg text-slate-400 mb-6 max-w-3xl">{feature.body}</p>
              <ul className="space-y-3">
                {feature.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="text-green-500 mt-1">&#10003;</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="text-center mt-24 py-16 border-t border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Build Your First AI Agent?</h2>
          <p className="text-xl text-slate-400 mb-8">
            Join thousands of businesses using Agent Forge to automate conversations across voice and text.
          </p>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-lg hover:from-orange-600 hover:to-red-600"
          >
            Start Your Free Trial
          </Link>
          <p className="text-sm text-slate-500 mt-3">14 days free, no credit card required</p>
        </div>
      </div>
    </div>
  );
}
