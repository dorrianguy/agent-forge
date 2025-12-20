import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Agent Forge to access your AI agents dashboard. Create, manage, and deploy AI agents without code.',
  openGraph: {
    title: 'Sign In - Agent Forge',
    description: 'Sign in to access your AI agents. Join thousands of businesses automating customer interactions.',
    url: 'https://agentforge.ai/login',
  },
  alternates: {
    canonical: '/login',
  },
  robots: {
    index: false,
    follow: true,
  },
};
