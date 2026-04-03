import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';

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

const categoryColors: Record<string, string> = {
  Guides: 'bg-orange-500/10 text-orange-400',
  Comparisons: 'bg-purple-500/10 text-purple-400',
  'Use Cases': 'bg-emerald-500/10 text-emerald-400',
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
            Guides, tutorials, and insights on building AI agents that grow your business.
          </p>
        </div>

        <div className="grid gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-orange-500/50 transition"
            >
              <div className="flex items-center gap-3 text-sm mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[post.category] ?? 'bg-slate-800 text-slate-400'}`}>
                  {post.category}
                </span>
                <time dateTime={post.date} className="text-slate-500">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span className="text-slate-600">{post.readingTime}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition">
                {post.title}
              </h2>
              <p className="text-slate-400 leading-relaxed">
                {post.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="text-center py-16 mt-8 border-t border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Build Your First AI Agent?
          </h2>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 py-3 px-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-lg hover:from-orange-600 hover:to-red-600 transition"
          >
            Start Building Free
          </Link>
          <p className="text-sm text-slate-500 mt-3">14 days free, no credit card required</p>
        </div>
      </div>
    </div>
  );
}
