import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build Your AI Agent',
  description: 'Create your AI agent in minutes. Choose from Customer Support, Sales Assistant, Lead Qualifier templates or build a custom agent from scratch. No coding required.',
  openGraph: {
    title: 'Build Your AI Agent - Agent Forge',
    description: 'Create your AI agent in minutes. No sign-up required to start building. Choose a template or build from scratch.',
    url: 'https://agent-forge.app/build',
  },
  alternates: {
    canonical: '/build',
  },
};

export default function BuildLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
