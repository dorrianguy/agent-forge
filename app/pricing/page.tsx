import type { Metadata } from 'next';
import Link from 'next/link';
import config from '@/config.json';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing — Affordable Plans for Every Team',
  description: 'Agent Forge pricing starts free. Scale to Pro ($99/mo) or Enterprise with unlimited AI agents, voice capabilities, and priority support. No credit card required.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Agent Forge Pricing — Build AI Agents at Any Scale',
    description: 'From free to enterprise. Create AI agents, chatbots, and voice assistants with transparent pricing.',
    url: 'https://agent-forge.app/pricing',
  },
};

// Server component — plan data renders as static HTML for crawlers
export default function PricingPage() {
  const { plans } = config.pricing;

  // Build the plans object for the client component
  const clientPlans = {
    starter: {
      name: plans.starter.name,
      price: plans.starter.price,
      interval: plans.starter.interval,
      features: plans.starter.features,
    },
    pro: {
      name: plans.pro.name,
      price: plans.pro.price,
      interval: plans.pro.interval,
      features: plans.pro.features,
    },
    enterprise: {
      name: plans.enterprise.name,
      price: plans.enterprise.price,
      interval: plans.enterprise.interval,
      features: plans.enterprise.features,
    },
  };

  // JSON-LD for pricing page
  const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Agent Forge Pricing',
    url: 'https://agent-forge.app/pricing',
    description: `Agent Forge pricing plans: Starter ($${plans.starter.price}/mo), Professional ($${plans.pro.price}/mo), Enterprise ($${plans.enterprise.price}/mo). All plans include voice minutes and phone numbers. 14-day free trial.`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: `${plans.starter.name} Plan`,
          description: `$${plans.starter.price}/month — ${plans.starter.features.join(', ')}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: `${plans.pro.name} Plan`,
          description: `$${plans.pro.price}/month — ${plans.pro.features.join(', ')}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${plans.enterprise.name} Plan`,
          description: `$${plans.enterprise.price}/month — ${plans.enterprise.features.join(', ')}`,
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header — static HTML, visible to crawlers */}
        <div className="text-center mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition">
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Interactive pricing cards with checkout */}
        <PricingClient plans={clientPlans} />

        {/* Contact — static HTML */}
        <div className="text-center">
          <p className="text-slate-400">
            Questions? <a href="mailto:support@agent-forge.app" className="text-orange-500 hover:text-orange-400">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
