import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Agent Forge. Start with our Starter plan at $49/month, scale with Professional at $149/month, or go unlimited with Enterprise at $499/month.',
  openGraph: {
    title: 'Agent Forge Pricing - Simple, Transparent Plans',
    description: 'Choose the plan that fits your needs. All plans include a 14-day free trial. Start building AI agents today.',
    url: 'https://agent-forge.app/pricing',
  },
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
