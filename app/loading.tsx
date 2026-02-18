import { Flame } from 'lucide-react';

/**
 * Global loading state for Agent Forge.
 * Shown during page transitions when Next.js is loading a new route.
 *
 * Note: This is a server component — no 'use client' needed.
 * framer-motion not used here for instant render without JS hydration.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Flame className="w-7 h-7 text-white" />
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
