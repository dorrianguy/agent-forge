import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost, getAllBlogSlugs } from '@/lib/blog-posts';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} | Agent Forge Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://agent-forge.app/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: 'Agent Forge',
      url: 'https://agent-forge.app',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Agent Forge',
      url: 'https://agent-forge.app',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://agent-forge.app/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto relative z-10">
        <div className="mb-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-orange-500 transition mb-6"
          >
            &larr; Back to Blog
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
            <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full">
              {post.category}
            </span>
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <span>{post.readingTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-slate-400">{post.description}</p>
        </div>

        <div className="border-t border-slate-800 pt-4 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
            AF
          </div>
          <div>
            <div className="text-sm font-medium text-white">Agent Forge Team</div>
            <div className="text-xs text-slate-500">agent-forge.app</div>
          </div>
        </div>

        <div
          className="prose prose-invert prose-slate max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-slate-400 prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-orange-500 prose-a:no-underline hover:prose-a:text-orange-400
            prose-strong:text-white
            prose-li:text-slate-400 prose-li:leading-relaxed
            prose-ul:mb-4 prose-ol:mb-4
            prose-table:border-collapse prose-table:w-full
            prose-th:bg-slate-800 prose-th:text-white prose-th:text-left prose-th:px-4 prose-th:py-3 prose-th:text-sm prose-th:font-medium prose-th:border prose-th:border-slate-700
            prose-td:px-4 prose-td:py-3 prose-td:text-sm prose-td:text-slate-400 prose-td:border prose-td:border-slate-800"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-16 text-center py-12 border-t border-slate-800">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Build Your First AI Agent?
          </h2>
          <p className="text-slate-400 mb-6">
            Deploy a production-ready voice or text agent in under 60 seconds. No code required.
          </p>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 py-3 px-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-lg hover:from-orange-600 hover:to-red-600 transition"
          >
            Start Building Free
          </Link>
          <p className="text-sm text-slate-500 mt-3">14 days free, no credit card required</p>
        </div>
      </article>
    </div>
  );
}
