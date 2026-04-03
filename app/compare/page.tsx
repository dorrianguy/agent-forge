import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Agent Builder Comparisons | Agent Forge',
  description: 'Compare Agent Forge with other AI agent platforms. Side-by-side feature, pricing, and capability comparisons with Voiceflow, Botpress, Bland AI, and more.',
  openGraph: {
    title: 'AI Agent Builder Comparisons | Agent Forge',
    description: 'Compare Agent Forge with other AI agent platforms. Side-by-side feature, pricing, and capability comparisons.',
    url: 'https://agent-forge.app/compare',
  },
  alternates: {
    canonical: '/compare',
  },
};

const comparisons = [
  { slug: 'agent-forge-vs-bland-ai', competitor: 'Bland AI', tagline: 'No-code multi-channel vs API-first phone automation' },
  { slug: 'agent-forge-vs-botpress', competitor: 'Botpress', tagline: 'Voice-first platform vs open-source chatbot builder' },
  { slug: 'agent-forge-vs-chatfuel', competitor: 'Chatfuel', tagline: 'Full AI agents vs social media chatbots' },
  { slug: 'agent-forge-vs-crewai', competitor: 'CrewAI', tagline: 'No-code builder vs developer multi-agent framework' },
  { slug: 'agent-forge-vs-dify', competitor: 'Dify', tagline: 'Production-ready agents vs open-source LLM app platform' },
  { slug: 'agent-forge-vs-lindy', competitor: 'Lindy', tagline: 'Customer-facing agents vs internal workflow automation' },
  { slug: 'agent-forge-vs-relevance-ai', competitor: 'Relevance AI', tagline: 'Voice + text agents vs AI workforce automation' },
  { slug: 'agent-forge-vs-stack-ai', competitor: 'Stack AI', tagline: 'No-code agents vs enterprise AI workflow builder' },
  { slug: 'agent-forge-vs-tidio', competitor: 'Tidio', tagline: 'AI voice + text agents vs live chat with AI assist' },
  { slug: 'agent-forge-vs-vapi', competitor: 'Vapi', tagline: 'No-code platform vs developer voice AI API' },
  { slug: 'agent-forge-vs-voiceflow', competitor: 'Voiceflow', tagline: 'Production voice agents vs conversational design tool' },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition"
          >
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            AI Agent Builder Comparisons
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            See how Agent Forge compares to other AI agent platforms. Honest, side-by-side breakdowns of features, pricing, and capabilities.
          </p>
        </div>

        <div className="grid gap-4">
          {comparisons.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-orange-500/50 transition group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white group-hover:text-orange-400 transition">
                    Agent Forge vs {c.competitor}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">{c.tagline}</p>
                </div>
                <span className="text-slate-600 group-hover:text-orange-500 transition text-xl">
                  &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-16 mt-8 border-t border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to See What Agent Forge Can Do?
          </h2>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-lg hover:from-orange-600 hover:to-red-600"
          >
            Start Your Free Trial
          </Link>
          <p className="text-sm text-slate-500 mt-3">
            14 days free, no credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
