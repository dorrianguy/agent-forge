'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, Trash2, Upload } from 'lucide-react';
import { formatRelativeTime } from '@/lib/version-types';

interface DraftBannerProps {
  lastSaved: string;
  changeCount: number;
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing?: boolean;
}

export default function DraftBanner({
  lastSaved,
  changeCount,
  onPublish,
  onDiscard,
  isPublishing = false,
}: DraftBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                Unpublished Changes
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                  {changeCount} {changeCount === 1 ? 'change' : 'changes'}
                </span>
              </h3>
              <p className="text-white/50 text-sm flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Last saved {formatRelativeTime(lastSaved)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onDiscard}
              disabled={isPublishing}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Discard
            </button>
            <motion.button
              onClick={onPublish}
              disabled={isPublishing}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publish Changes
                </>
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Auto-save indicator */}
        <motion.div
          className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          Auto-saving enabled — your changes are saved automatically
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
