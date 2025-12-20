import type { Metadata } from 'next';
import '../src/styles/animations.css';
import './globals.css';

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
    url: 'https://agentforge.ai',
    siteName: 'Agent Forge',
    title: 'Agent Forge - Build AI Agents Without Code',
    description: 'Build production-ready AI agents in minutes. No coding required. Create customer support bots, sales assistants, and lead qualifiers.',
    images: [
      {
        url: 'https://agentforge.ai/og-image.png',
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
    images: ['https://agentforge.ai/og-image.png'],
    creator: '@agentforge',
  },
  metadataBase: new URL('https://agentforge.ai'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950">{children}</body>
    </html>
  );
}
