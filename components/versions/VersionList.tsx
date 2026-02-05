'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Clock,
  User,
  RotateCcw,
  Eye,
  GitCompare,
  Check,
  ChevronRight,
  Sparkles,
  Archive,
  FileText,
} from 'lucide-react';
import { AgentVersion, formatRelativeTime, getVersionLabel } from '@/lib/version-types';

interface VersionListProps {
  versions: AgentVersion[];
  currentVersion: number;
  onRollback: (version: AgentVersion) => void;
  onPreview: (version: AgentVersion) => void;
  onCompare: (v1: AgentVersion, v2: AgentVersion) => void;
  isLoading?: boolean;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export default function VersionList({
  versions,
  currentVersion,
  onRollback,
  onPreview,
  onCompare,
  isLoading = false,
}: VersionListProps) {
  const [selectedForCompare, setSelectedForCompare] = useState<AgentVersion | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  // Sort versions by version number descending
  const sortedVersions = [...versions]
    .filter(v => v.status !== 'draft')
    .sort((a, b) => b.version - a.version);

  const handleCompareSelect = (version: AgentVersion) => {
    if (selectedForCompare) {
      if (selectedForCompare.id !== version.id) {
        onCompare(selectedForCompare, version);
      }
      setSelectedForCompare(null);
    } else {
      setSelectedForCompare(version);
    }
  };

  const getStatusBadge = (version: AgentVersion) => {
    if (version.version === currentVersion && version.status === 'published') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Current
        </span>
      );
    }
    if (version.status === 'archived') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-white/40 flex items-center gap-1">
          <Archive className="w-3 h-3" />
          Archived
        </span>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white/5 border border-white/5 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-24" />
                <div className="h-3 bg-white/10 rounded w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sortedVersions.length === 0) {
    return (
      <motion.div
        className="text-center py-12 rounded-2xl bg-white/5 border border-white/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Version History</h3>
        <p className="text-white/50 text-sm">
          Publish your first version to start tracking changes.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Compare mode indicator */}
      <AnimatePresence>
        {selectedForCompare && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-4"
          >
            <span className="text-purple-400 text-sm flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Select another version to compare with{' '}
              <span className="font-semibold">v{selectedForCompare.version}</span>
            </span>
            <button
              onClick={() => setSelectedForCompare(null)}
              className="text-white/60 hover:text-white text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version list */}
      <motion.div
        className="space-y-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {sortedVersions.map((version) => (
          <motion.div
            key={version.id}
            variants={fadeInUp}
            className={`relative rounded-xl border transition-all overflow-hidden ${
              selectedForCompare?.id === version.id
                ? 'bg-purple-500/10 border-purple-500/30'
                : version.version === currentVersion
                ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                : 'bg-white/5 border-white/5 hover:border-white/10'
            }`}
          >
            {/* Main row */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedVersion(
                expandedVersion === version.id ? null : version.id
              )}
            >
              <div className="flex items-center gap-4">
                {/* Version indicator */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                  version.version === currentVersion
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400'
                    : 'bg-white/10 text-white/60'
                }`}>
                  {getVersionLabel(version)}
                </div>

                {/* Version info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">
                      Version {version.version}
                    </span>
                    {getStatusBadge(version)}
                    {version.rollbackFromVersion && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Rollback from v{version.rollbackFromVersion}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {version.publishedAt
                        ? formatRelativeTime(version.publishedAt)
                        : formatRelativeTime(version.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {version.createdBy}
                    </span>
                  </div>
                </div>

                {/* Expand indicator */}
                <motion.div
                  animate={{ rotate: expandedVersion === version.id ? 90 : 0 }}
                  className="text-white/40"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.div>
              </div>

              {/* Version notes */}
              {version.notes && (
                <div className="mt-3 pl-16">
                  <p className="text-white/50 text-sm flex items-start gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {version.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Expanded actions */}
            <AnimatePresence>
              {expandedVersion === version.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-white/5"
                >
                  <div className="p-4 pl-16 flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(version);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompareSelect(version);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                        selectedForCompare?.id === version.id
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <GitCompare className="w-4 h-4" />
                      {selectedForCompare?.id === version.id ? 'Selected' : 'Compare'}
                    </button>
                    {version.version !== currentVersion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRollback(version);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-sm font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Rollback to this version
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
