'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Flame, RefreshCw, Home, AlertTriangle } from 'lucide-react';

/**
 * Global error boundary for Agent Forge.
 * Catches unhandled errors in any page and shows a user-friendly error screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, Datadog, etc.
      console.error('[Agent Forge Error]', {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    } else {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Agent Forge</span>
        </Link>

        {/* Error icon */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-white/60 mb-2">
          An unexpected error occurred. Our team has been notified.
        </p>

        {/* Error digest for support reference */}
        {error.digest && (
          <p className="text-white/30 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium flex items-center gap-2 hover:bg-white/10 transition"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>

        {/* Support link */}
        <p className="mt-8 text-white/40 text-sm">
          If this keeps happening,{' '}
          <a
            href="mailto:support@agent-forge.app"
            className="text-orange-400 hover:text-orange-300 transition"
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
