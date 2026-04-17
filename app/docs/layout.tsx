import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — Build with Agent Forge',
  description: 'Complete guide to building, deploying, and scaling AI agents with Agent Forge. Covers the agent builder, voice agents, embed widget, API reference, and multi-channel deployment.',
  alternates: { canonical: '/docs' },
  openGraph: {
    title: 'Agent Forge Documentation — Developer Guide',
    description: 'Everything you need to create, deploy, and scale AI agents with Agent Forge. From first bot to enterprise rollout.',
    url: 'https://agent-forge.app/docs',
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
