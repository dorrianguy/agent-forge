import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog | Agent Forge — AI Agent Insights & Updates',
  description: 'Insights, tutorials, and updates on building AI agents, voice AI, customer automation, and no-code development from the Agent Forge team.',
  openGraph: {
    title: 'Agent Forge Blog — AI Agent Insights & Updates',
    description: 'Insights, tutorials, and updates on building AI agents, voice AI, and customer automation.',
    url: 'https://agent-forge.app/blog',
  },
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Blog</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Insights, tutorials, and updates on building AI agents that actually work.
          </p>
        </div>

        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-lg mb-4">Our first articles are coming soon.</p>
          <p className="text-slate-500">
            In the meantime, <Link href="/build" className="text-orange-500 hover:text-orange-400">build your first AI agent</Link> in under 60 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
