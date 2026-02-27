'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  History,
  Flame,
  Bot,
  RotateCcw,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getAgent } from '@/lib/auth';
import { useVersioning } from '@/hooks/useVersioning';
import type { Agent } from '@/lib/supabase';
import type { AgentVersion } from '@/lib/version-types';
import VersionList from '@/components/versions/VersionList';
import VersionDiff from '@/components/versions/VersionDiff';
import DraftBanner from '@/components/versions/DraftBanner';
import PublishButton from '@/components/agents/PublishButton';

export default function VersionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = (params?.id ?? '') as string;

  // Agent data
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Version management
  const versioning = useVersioning(agentId);

  // UI state
  const [showDiff, setShowDiff] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    v1: AgentVersion | null;
    v2: AgentVersion | null;
  }>({ v1: null, v2: null });
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<AgentVersion | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load agent and versions
  useEffect(() => {
    async function loadData() {
      try {
        const agentData = await getAgent(agentId);
        if (!agentData) {
          router.push('/dashboard');
          return;
        }
        setAgent(agentData);
        await versioning.loadVersions();
      } catch (error) {
        console.error('Failed to load agent:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [agentId, router]);

  // Handle version preview
  const handlePreview = (version: AgentVersion) => {
    // In a real app, this would open a preview modal or page
    console.log('Preview version:', version);
    // For now, we'll just show the diff against current
    const current = versioning.currentVersion;
    if (current && current.version !== version.version) {
      setCompareVersions({ v1: version, v2: current });
      setShowDiff(true);
    }
  };

  // Handle version comparison
  const handleCompare = (v1: AgentVersion, v2: AgentVersion) => {
    // Always put older version on left
    const [older, newer] = v1.version < v2.version ? [v1, v2] : [v2, v1];
    setCompareVersions({ v1: older, v2: newer });
    setShowDiff(true);
  };

  // Handle rollback initiation
  const handleRollbackClick = (version: AgentVersion) => {
    setRollbackTarget(version);
    setRollbackReason('');
    setShowRollbackModal(true);
  };

  // Execute rollback
  const handleRollback = async () => {
    if (!rollbackTarget) return;

    setIsRollingBack(true);
    try {
      await versioning.rollback(rollbackTarget.version, rollbackReason);
      setShowRollbackModal(false);
      setRollbackTarget(null);
      setRollbackReason('');
    } catch (error) {
      console.error('Rollback failed:', error);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Handle publish
  const handlePublish = async (options: { notes: string; scheduledFor: string | null }) => {
    setIsPublishing(true);
    try {
      await versioning.publish(options);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle discard draft
  const handleDiscard = () => {
    versioning.discardDraft();
  };

  // Get comparison data for diff view
  const getComparisonChanges = () => {
    if (compareVersions.v1 && compareVersions.v2) {
      return versioning.compareVersions(
        compareVersions.v1.version,
        compareVersions.v2.version
      );
    }
    return { totalChanges: 0, added: 0, removed: 0, modified: 0, diffs: [] };
  };

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

  const currentVersionNumber = versioning.currentVersion?.version || 0;
  const draftChanges = versioning.getDraftChanges();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -top-48 -left-48"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">
                      {agent?.name || 'Agent'}
                    </h1>
                    <p className="text-white/50 text-sm flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Version History
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => versioning.loadVersions()}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${versioning.isLoading ? 'animate-spin' : ''}`} />
                </button>
                {versioning.hasDraftChanges && (
                  <PublishButton
                    changes={draftChanges}
                    onPublish={handlePublish}
                    disabled={isPublishing}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Draft Banner */}
          {versioning.hasDraftChanges && versioning.draft && (
            <DraftBanner
              lastSaved={versioning.draft.lastSaved}
              changeCount={draftChanges.totalChanges}
              onPublish={() => {
                // Open publish modal via button
              }}
              onDiscard={handleDiscard}
              isPublishing={isPublishing}
            />
          )}

          {/* Error display */}
          <AnimatePresence>
            {versioning.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between"
              >
                <span className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {versioning.error}
                </span>
                <button
                  onClick={versioning.clearError}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <motion.div
              className="p-4 rounded-xl bg-white/5 border border-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-white/40 text-sm mb-1">Current Version</p>
              <p className="text-2xl font-bold text-white">
                v{currentVersionNumber}
              </p>
            </motion.div>
            <motion.div
              className="p-4 rounded-xl bg-white/5 border border-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-white/40 text-sm mb-1">Total Versions</p>
              <p className="text-2xl font-bold text-white">
                {versioning.versions.filter(v => v.status !== 'draft').length}
              </p>
            </motion.div>
            <motion.div
              className="p-4 rounded-xl bg-white/5 border border-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-white/40 text-sm mb-1">Draft Status</p>
              <p className="text-2xl font-bold text-white">
                {versioning.hasDraftChanges ? (
                  <span className="text-orange-400">Unsaved</span>
                ) : (
                  <span className="text-green-400">Clean</span>
                )}
              </p>
            </motion.div>
          </div>

          {/* Version list or Diff view */}
          <AnimatePresence mode="wait">
            {showDiff ? (
              <motion.div
                key="diff"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => setShowDiff(false)}
                  className="mb-4 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Version List
                </button>
                <VersionDiff
                  leftVersion={compareVersions.v1}
                  rightVersion={compareVersions.v2}
                  changes={getComparisonChanges()}
                  onClose={() => setShowDiff(false)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-xl font-semibold text-white mb-4">
                  Published Versions
                </h2>
                <VersionList
                  versions={versioning.versions}
                  currentVersion={currentVersionNumber}
                  onRollback={handleRollbackClick}
                  onPreview={handlePreview}
                  onCompare={handleCompare}
                  isLoading={versioning.isLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Rollback Confirmation Modal */}
      <AnimatePresence>
        {showRollbackModal && rollbackTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !isRollingBack && setShowRollbackModal(false)}
            />
            <motion.div
              className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Rollback to v{rollbackTarget.version}
                    </h3>
                    <p className="text-white/50 text-sm">
                      This will create a new version
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-200/80 text-sm">
                    Rolling back will restore your agent to the state it was in
                    at <strong>v{rollbackTarget.version}</strong>. This is a
                    non-destructive action — a new version (v{currentVersionNumber + 1})
                    will be created with the old configuration.
                  </p>
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    Reason for rollback (optional)
                  </label>
                  <textarea
                    value={rollbackReason}
                    onChange={(e) => setRollbackReason(e.target.value)}
                    placeholder="Why are you rolling back to this version?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowRollbackModal(false)}
                  disabled={isRollingBack}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleRollback}
                  disabled={isRollingBack}
                  className="px-5 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-medium flex items-center gap-2 border border-yellow-500/30 disabled:opacity-50"
                  whileHover={{ scale: isRollingBack ? 1 : 1.02 }}
                  whileTap={{ scale: isRollingBack ? 1 : 0.98 }}
                >
                  {isRollingBack ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Rolling back...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Confirm Rollback
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
