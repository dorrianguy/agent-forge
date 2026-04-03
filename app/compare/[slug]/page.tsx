import type { Metadata } from 'next';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

const COMPARISONS_DIR = path.join(process.cwd(), 'geo-content', 'comparisons');
const BASE_URL = 'https://agent-forge.app';

const SLUGS = [
  'agent-forge-vs-bland-ai',
  'agent-forge-vs-botpress',
  'agent-forge-vs-chatfuel',
  'agent-forge-vs-crewai',
  'agent-forge-vs-dify',
  'agent-forge-vs-lindy',
  'agent-forge-vs-relevance-ai',
  'agent-forge-vs-stack-ai',
  'agent-forge-vs-tidio',
  'agent-forge-vs-vapi',
  'agent-forge-vs-voiceflow',
];

function getCompetitorName(slug: string): string {
  return slug
    .replace('agent-forge-vs-', '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface Section {
  type: 'h1' | 'h2' | 'table' | 'ul' | 'p';
  content: string;
  rows?: string[][];
  headers?: string[];
  items?: string[];
}

function parseMarkdown(raw: string): Section[] {
  const lines = raw.split('\n');
  const sections: Section[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      sections.push({ type: 'h1', content: line.slice(2).trim() });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      sections.push({ type: 'h2', content: line.slice(3).trim() });
      i++;
      continue;
    }

    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s-|]+$/)) {
      const headers = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.replace(/\*\*/g, '').trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(
          lines[i]
            .split('|')
            .slice(1, -1)
            .map((c) => c.replace(/\*\*/g, '').trim()),
        );
        i++;
      }
      sections.push({ type: 'table', content: '', headers, rows });
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      sections.push({ type: 'ul', content: '', items });
      continue;
    }

    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('*Note') && !trimmed.startsWith('→')) {
      sections.push({ type: 'p', content: trimmed });
      i++;
      continue;
    }

    if (trimmed.startsWith('*Note')) {
      sections.push({ type: 'p', content: trimmed.replace(/^\*/, '').replace(/\*$/, '') });
      i++;
      continue;
    }

    i++;
  }

  return sections;
}

function extractFaqPairs(sections: Section[]): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.type === 'h2' && s.content.startsWith('When to Choose')) {
      const name = s.content.replace('When to Choose ', '');
      const items = sections[i + 1]?.items;
      if (items) {
        faqs.push({
          question: `When should I choose ${name}?`,
          answer: items.map((it) => it.replace(/\*\*/g, '')).join('. ') + '.',
        });
      }
    }
    if (s.type === 'h2' && s.content === 'Bottom Line') {
      const next = sections[i + 1];
      if (next?.type === 'p') {
        faqs.push({
          question: `What is the bottom line on this comparison?`,
          answer: next.content.replace(/\*\*/g, ''),
        });
      }
    }
  }
  return faqs;
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-orange-500 hover:text-orange-400 underline">$1</a>');
}

function readComparison(slug: string): { raw: string; sections: Section[] } | null {
  const filePath = path.join(COMPARISONS_DIR, `${slug}.md`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { raw, sections: parseMarkdown(raw) };
  } catch {
    return null;
  }
}

export function generateStaticParams(): { slug: string }[] {
  return SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const competitor = getCompetitorName(params.slug);
  const title = `Agent Forge vs ${competitor} (2026 Comparison)`;
  const description = `Compare Agent Forge and ${competitor} side-by-side. Features, pricing, voice capabilities, and which AI agent builder is right for your business.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/compare/${params.slug}`,
      type: 'article',
    },
    alternates: {
      canonical: `/compare/${params.slug}`,
    },
  };
}

export default function ComparisonPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = readComparison(params.slug);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 py-20 px-4 text-center">
        <h1 className="text-3xl font-bold text-white">Comparison not found</h1>
        <Link href="/compare" className="text-orange-500 hover:text-orange-400 mt-4 inline-block">
          View all comparisons
        </Link>
      </div>
    );
  }

  const { sections } = data;
  const competitor = getCompetitorName(params.slug);
  const faqs = extractFaqPairs(sections);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <article className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition text-sm"
          >
            &larr; All Comparisons
          </Link>
          {sections
            .filter((s) => s.type === 'h1')
            .map((s, i) => (
              <h1 key={i} className="text-4xl md:text-5xl font-bold text-white mb-6">
                {s.content}
              </h1>
            ))}
        </div>

        {sections
          .filter((s) => s.type !== 'h1')
          .map((section, i) => {
            switch (section.type) {
              case 'h2':
                return (
                  <h2
                    key={i}
                    className="text-2xl font-bold text-white mb-6 mt-16"
                  >
                    {section.content}
                  </h2>
                );

              case 'table':
                return (
                  <div key={i} className="overflow-x-auto mb-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          {section.headers?.map((h, j) => (
                            <th
                              key={j}
                              className="py-3 px-4 text-sm font-semibold text-orange-400 border-b border-slate-800 bg-slate-900/50"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows?.map((row, j) => (
                          <tr
                            key={j}
                            className="border-b border-slate-800/50 hover:bg-slate-900/30"
                          >
                            {row.map((cell, k) => (
                              <td
                                key={k}
                                className="py-3 px-4 text-sm text-slate-300"
                                dangerouslySetInnerHTML={{
                                  __html: formatInlineMarkdown(cell),
                                }}
                              />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

              case 'ul':
                return (
                  <ul key={i} className="space-y-2 mb-8 ml-4">
                    {section.items?.map((item, j) => (
                      <li
                        key={j}
                        className="text-slate-400 flex items-start gap-2"
                      >
                        <span className="text-orange-500 mt-1.5 shrink-0">
                          &bull;
                        </span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: formatInlineMarkdown(item),
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                );

              case 'p':
                return (
                  <p
                    key={i}
                    className="text-lg text-slate-400 mb-4"
                    dangerouslySetInnerHTML={{
                      __html: formatInlineMarkdown(section.content),
                    }}
                  />
                );

              default:
                return null;
            }
          })}

        {/* Internal Links */}
        <div className="mt-16 grid md:grid-cols-3 gap-4">
          <Link
            href="/features"
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-orange-500/50 transition"
          >
            <div className="text-sm text-orange-500 mb-1">Explore</div>
            <div className="text-white font-semibold">
              All Features
            </div>
            <div className="text-sm text-slate-400 mt-1">
              See everything Agent Forge can do
            </div>
          </Link>
          <Link
            href="/pricing"
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-orange-500/50 transition"
          >
            <div className="text-sm text-orange-500 mb-1">Compare</div>
            <div className="text-white font-semibold">
              Pricing Plans
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Transparent pricing, no hidden fees
            </div>
          </Link>
          <Link
            href="/compare"
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-orange-500/50 transition"
          >
            <div className="text-sm text-orange-500 mb-1">Read More</div>
            <div className="text-white font-semibold">
              All Comparisons
            </div>
            <div className="text-sm text-slate-400 mt-1">
              See how Agent Forge stacks up
            </div>
          </Link>
        </div>

        {/* CTA */}
        <div className="text-center py-16 mt-8 border-t border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Try Agent Forge Over {competitor}?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Build your first AI agent in 60 seconds. No code required, phone numbers included.
          </p>
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
      </article>
    </div>
  );
}
