'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">Agent Forge</span>
          </div>
        </Link>
        <div className="flex items-center gap-6 text-white/60 text-sm">
          <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
          <Link href="/docs" className="hover:text-white transition">Documentation</Link>
          <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms</Link>
        </div>
        <p className="text-white/40 text-sm">
          &copy; {new Date().getFullYear()} Agent Forge. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
