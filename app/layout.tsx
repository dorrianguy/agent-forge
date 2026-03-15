import type { Metadata } from 'next';
import '../src/styles/animations.css';
import './globals.css';
import NativeAppShell from '@/components/NativeAppShell';
import NativeInit from '@/components/native-init';

export const metadata: Metadata = {
  title: {
    default: 'Agent Forge - Build AI Agents Without Code',
    template: '%s | Agent Forge',
  },
  description: 'Build production-ready AI agents in minutes. No coding required. Create customer support bots, sales assistants, and lead qualifiers with our autonomous AI agent builder platform.',
  keywords: ['AI agents', 'no-code AI', 'chatbot builder', 'customer support bot', 'sales assistant AI', 'lead qualification', 'autonomous agents'],
  authors: [{ name: 'Agent Forge' }],
  creator: 'Agent Forge',
  publisher: 'Agent Forge',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://agent-forge.app',
    siteName: 'Agent Forge',
    title: 'Agent Forge - Build AI Agents Without Code',
    description: 'Build production-ready AI agents in minutes. No coding required. Create customer support bots, sales assistants, and lead qualifiers.',
    images: [
      {
        url: 'https://agent-forge.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Agent Forge - Build AI Agents Without Code',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Forge - Build AI Agents Without Code',
    description: 'Build production-ready AI agents in minutes. No coding required.',
    images: ['https://agent-forge.app/og-image.png'],
    creator: '@agentforge',
  },
  verification: {
    google: '_oaXQaUXOI5B_Qqes6y1yafjyFijeln5uHAJpteyPKo',
  },
  metadataBase: new URL('https://agent-forge.app'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Agent Forge',
  url: 'https://agent-forge.app',
  description: 'No-code AI agent builder with voice, phone, and multi-channel capabilities. Build and deploy AI agents in 60 seconds without writing code.',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'AI Agent Builder',
  operatingSystem: 'Web',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '79',
    highPrice: '799',
    offerCount: '3',
  },
  featureList: [
    'No-code AI agent builder',
    'Voice agents with phone integration',
    'Dedicated phone numbers included',
    'TTS voice cloning',
    'Multi-channel deployment (web, WhatsApp, Slack, Discord, SMS, phone, email)',
    'Real-time analytics',
    'SOC 2 compliant',
    'White-label for agencies',
    'Batch calling campaigns',
    '60-second deployment',
    '14-day free trial',
  ],
  author: {
    '@type': 'Organization',
    name: 'Agent Forge',
    url: 'https://agent-forge.app',
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Agent Forge',
  url: 'https://agent-forge.app',
  logo: 'https://agent-forge.app/logo.png',
  description: 'No-code AI agent builder with voice, phone, and multi-channel capabilities.',
  foundingDate: '2025',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@agent-forge.app',
    contactType: 'customer support',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="bg-slate-950">
        <NativeInit />
        <NativeAppShell>{children}</NativeAppShell>
      </body>
    </html>
  );
}
