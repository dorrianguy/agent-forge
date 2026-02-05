'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { VersionChangeSummary, PublishOptions } from '@/lib/version-types';

interface PublishButtonProps {
  changes: VersionChangeSummary;
  onPublish: (options: PublishOptions) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function PublishButton({
  changes,
  onPublish,
  disabled = false,
  className = '',
}: PublishButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setNotes('');
    setScheduleEnabled(false);
    setScheduledDate('');
    setScheduledTime('');
    setError(null);
  };

  const handlePublish = async () => {
    setError(null);
    setIsPublishing(true);

    try {
      let scheduledFor: string | null = null;
      
      if (scheduleEnabled && scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduledDateTime <= new Date()) {
          setError('Scheduled time must be in the future');
          setIsPublishing(false);
          return;
        }
        scheduledFor = scheduledDateTime.toISOString();
      }

      await onPublish({
        notes: notes.trim() || 'No notes provided',
        scheduledFor,
      });

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  // Get minimum date for scheduling (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <>
      {/* Publish button */}
      <motion.button
        onClick={handleOpenModal}
        disabled={disabled || changes.totalChanges === 0}
        className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
      >
        <Upload className="w-4 h-4" />
        Publish
        {changes.totalChanges > 0 && (
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {changes.totalChanges}
          </span>
        )}
      </motion.button>

      {/* Publish modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !isPublishing && setIsModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Publish Changes
                      </h3>
                      <p className="text-white/50 text-sm">
                        Make your changes live
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isPublishing && setIsModalOpen(false)}
                    disabled={isPublishing}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Changes summary */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h4 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Changes to Publish
                  </h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    {changes.added > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-sm">
                        +{changes.added} added
                      </span>
                    )}
                    {changes.removed > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-sm">
                        -{changes.removed} removed
                      </span>
                    )}
                    {changes.modified > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 text-sm">
                        ~{changes.modified} modified
                      </span>
                    )}
                  </div>
                </div>

                {/* Version notes */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">
                    Version Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                  />
                </div>

                {/* Schedule option */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setScheduleEnabled(!scheduleEnabled)}
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded border ${
                        scheduleEnabled
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-white/30'
                      } flex items-center justify-center transition-colors`}
                    >
                      {scheduleEnabled && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Schedule for later
                    </span>
                  </button>

                  <AnimatePresence>
                    {scheduleEnabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-white/50 text-xs mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              min={minDate}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500/50 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-white/50 text-xs mb-1">
                              Time
                            </label>
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500/50 focus:outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPublishing}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
                  whileHover={{ scale: isPublishing ? 1 : 1.02 }}
                  whileTap={{ scale: isPublishing ? 1 : 0.98 }}
                >
                  {isPublishing ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Publishing...
                    </>
                  ) : scheduleEnabled ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      Schedule Publish
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Publish Now
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
