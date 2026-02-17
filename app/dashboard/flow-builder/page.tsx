'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUser, getProfile } from '@/lib/auth';
import type { Profile } from '@/lib/supabase';
import { useFlowBuilder } from '@/hooks/useFlowBuilder';
import type { NodeType } from '@/lib/flow-types';
import { FlowCanvas, Sidebar, Toolbar } from '@/components/flow-builder';

export default function FlowBuilderPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [fitViewFn, setFitViewFn] = useState<(() => void) | null>(null);

  const { flowName, isDirty } = useFlowBuilder();
  const updateFlowName = useFlowBuilder((state) => state.flowName);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getUser();
        if (!user) {
          router.push('/login?redirect=/dashboard/flow-builder');
          return;
        }

        const profileData = await getProfile();
        if (!profileData || profileData.plan === 'free' || !profileData.plan) {
          router.push('/pricing?required=true');
          return;
        }

        setProfile(profileData);
      } catch {
        router.push('/login?redirect=/dashboard/flow-builder');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  // Handle drag start from sidebar
  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: NodeType) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // Store fit view function reference
  const handleFitViewRef = useCallback((fn: () => void) => {
    setFitViewFn(() => fn);
  }, []);

  // Handle fit view
  const handleFitView = useCallback(() => {
    if (fitViewFn) {
      fitViewFn();
    }
  }, [fitViewFn]);

  // Handle flow name change
  const handleNameChange = useCallback((name: string) => {
    useFlowBuilder.setState({ flowName: name, isDirty: true });
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Flame className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 pointer-events-none" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white/60 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>

            <div className="w-px h-6 bg-white/10" />

            <Link href="/" className="flex items-center gap-2">
              <motion.div
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
              >
                <Flame className="w-4 h-4 text-white" />
              </motion.div>
              <span className="text-sm font-semibold">Flow Builder</span>
            </Link>
          </div>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition"
            title="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        onFitView={handleFitView}
        flowName={flowName}
        onNameChange={handleNameChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar onDragStart={handleDragStart} />

        {/* Canvas */}
        <FlowCanvas onFitViewRef={handleFitViewRef} />
      </div>

      {/* Help Modal */}
      {showHelp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Flow Builder Help</h2>

              <div className="space-y-4 text-sm text-white/70">
                <div>
                  <h3 className="font-semibold text-white mb-1">Getting Started</h3>
                  <p>
                    Drag nodes from the sidebar onto the canvas. Connect nodes by
                    dragging from one handle to another.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-1">Node Types</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Start:</strong> Entry point of your flow</li>
                    <li><strong>Message:</strong> Send a message to the user</li>
                    <li><strong>User Input:</strong> Wait for user response</li>
                    <li><strong>Condition:</strong> Branch based on conditions</li>
                    <li><strong>AI Response:</strong> Generate AI-powered response</li>
                    <li><strong>API Call:</strong> Make HTTP requests</li>
                    <li><strong>Set Variable:</strong> Store data</li>
                    <li><strong>Handoff:</strong> Transfer to human agent</li>
                    <li><strong>End:</strong> End the conversation</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-1">Keyboard Shortcuts</h3>
                  <ul className="space-y-1">
                    <li><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Delete</kbd> — Delete selected node</li>
                    <li><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Ctrl+D</kbd> — Duplicate selected node</li>
                    <li><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Ctrl+Z</kbd> — Undo</li>
                    <li><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Ctrl+Y</kbd> — Redo</li>
                    <li><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Escape</kbd> — Deselect</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-medium"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
