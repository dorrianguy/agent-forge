import type { Metadata } from 'next';
import '../src/styles/animations.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Forge - Build AI Agents Without Code',
  description: 'The autonomous AI agent builder platform',
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
