'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Flame, Lock, ArrowRight, Loader2, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validToken, setValidToken] = useState(true);

  // Supabase handles the token exchange via the URL hash automatically
  // The user arrives here after clicking the reset link in their email
  useEffect(() => {
    const supabase = createClient();
    // Check if we have an active session (Supabase auto-exchanges the token)
    supabase.auth.getSession().then(({ data, error }: { data: { session: unknown }; error: unknown }) => {
      if (error || !data.session) {
        // No valid session — token may be expired or invalid
        setValidToken(false);
      }
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;
      setSuccess(true);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Invalid or Expired Link</h2>
        <p className="text-white/60 mb-8">
          This password reset link is no longer valid. Please request a new one.
        </p>
        <Link href="/forgot-password">
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold inline-flex items-center gap-2 shadow-lg shadow-orange-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Request New Link
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </Link>
      </motion.div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
        >
          <Check className="w-10 h-10 text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-3">Password Updated!</h2>
        <p className="text-white/60 mb-2">Your password has been successfully changed.</p>
        <p className="text-white/40 text-sm">Redirecting to your dashboard...</p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">Set New Password</h1>
        <p className="text-white/60">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Password strength indicator */}
        <div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => {
              const strength = password.length === 0 ? 0
                : password.length < 6 ? 1
                : password.length < 10 ? 2
                : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4
                : 3;
              const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
              return (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    level <= strength ? colors[strength] : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-white/40 text-xs mt-1">
            {password.length === 0 ? '' : password.length < 6 ? 'Too short' : password.length < 10 ? 'Fair' : 'Strong'}
          </p>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm text-center"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
          whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(249, 115, 22, 0.3)" }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Update Password
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] bg-orange-500/15 rounded-full blur-3xl top-1/4 right-1/4"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link href="/" className="flex items-center gap-3 justify-center mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">Agent Forge</span>
        </Link>

        <Suspense fallback={
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
