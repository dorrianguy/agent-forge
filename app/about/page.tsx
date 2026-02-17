import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | Agent Forge — The AI Agent Builder for Everyone',
  description: 'Agent Forge makes it possible for any business to build, deploy, and manage AI voice and text agents — without writing code. Learn about our mission and vision.',
  openGraph: {
    title: 'About Agent Forge — The AI Agent Builder for Everyone',
    description: 'Agent Forge makes it possible for any business to build, deploy, and manage AI voice and text agents — without writing code.',
    url: 'https://agent-forge.app/about',
  },
  alternates: {
    canonical: '/about',
  },
};

const stats = [
  { value: '2,500+', label: 'Businesses building with Agent Forge' },
  { value: '1M+', label: 'Conversations handled' },
  { value: '60s', label: 'Average time to deploy' },
  { value: '4.9/5', label: 'Customer satisfaction' },
];

const values = [
  { title: 'Simplicity over complexity', body: "If it requires a tutorial, we haven't made it simple enough." },
  { title: 'Ship fast, iterate faster', body: 'We release improvements weekly based on real user feedback.' },
  { title: 'Your data is yours', body: 'We never train on customer data. Enterprise customers can deploy on-premise for complete data sovereignty.' },
  { title: 'Transparency', body: 'Our pricing is public. Our roadmap is open. We tell you what works and what\'s coming.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition">
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            We&apos;re Building the Future of Business Communication
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Agent Forge exists because every business deserves AI agents — not just the ones with engineering teams.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Our Mission</h2>
          <div className="space-y-4 text-lg text-slate-400">
            <p>
              Most businesses know they need AI. They see competitors using chatbots, voice assistants, and automated workflows. But building AI agents has traditionally required engineers, months of development, and expensive infrastructure.
            </p>
            <p>We started Agent Forge to change that.</p>
            <p>
              Agent Forge is a no-code AI agent builder that lets anyone — from solo entrepreneurs to enterprise teams — create production-ready voice and text agents in minutes. No coding. No complex integrations. No six-figure consulting engagements.
            </p>
            <p>We believe AI should be accessible to every business, not just the ones that can afford dedicated AI teams.</p>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">What Makes Us Different</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Voice-First, Not Voice-Later</h3>
              <p className="text-slate-400">Most AI agent platforms started as text chatbot tools and bolted on voice as an afterthought. Agent Forge was built voice-first from day one. Every agent you create can handle phone calls, speak naturally, and operate across voice and text seamlessly.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Built for Speed</h3>
              <p className="text-slate-400">We obsess over time-to-value. The average Agent Forge user goes from signup to deployed agent in under 60 seconds. No tutorials needed. No onboarding calls.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Honest Pricing</h3>
              <p className="text-slate-400">Phone numbers and voice minutes are included in every plan — not surprise add-ons. What you see on our pricing page is what you pay. No usage gotchas. No hidden fees.</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-slate-400">{value.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-6">Contact</h2>
          <div className="grid md:grid-cols-2 gap-4 text-slate-400">
            <div><span className="text-slate-500">General:</span> <a href="mailto:hello@agent-forge.app" className="text-orange-500 hover:text-orange-400">hello@agent-forge.app</a></div>
            <div><span className="text-slate-500">Support:</span> <a href="mailto:support@agent-forge.app" className="text-orange-500 hover:text-orange-400">support@agent-forge.app</a></div>
            <div><span className="text-slate-500">Partnerships:</span> <a href="mailto:partners@agent-forge.app" className="text-orange-500 hover:text-orange-400">partners@agent-forge.app</a></div>
            <div><span className="text-slate-500">Press:</span> <a href="mailto:press@agent-forge.app" className="text-orange-500 hover:text-orange-400">press@agent-forge.app</a></div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-16 border-t border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to See What Agent Forge Can Do?</h2>
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
