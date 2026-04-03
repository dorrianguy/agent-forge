import { MetadataRoute } from 'next';

/**
 * Dynamic sitemap generation for Agent Forge.
 * Next.js automatically serves this at /sitemap.xml
 *
 * Includes all public pages that should be indexed by search engines.
 * Private routes (dashboard, billing, settings) are excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://agent-forge.app';
  const now = new Date();

  const blogSlugs = [
    'what-is-no-code-ai-agent-builder',
    'build-ai-customer-support-agent',
    'ai-agent-builder-comparison-2026',
    'ai-agents-small-business',
    'ai-voice-agents-guide',
  ];

  const blogPages = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const comparisonSlugs = [
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

  const comparisonPages = comparisonSlugs.map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/build`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...comparisonPages,
    ...blogPages,
  ];
}
