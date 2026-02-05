'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Play, Trash2, Share2, Copy, Check,
  ChevronRight, Clock, MessageSquare, DollarSign,
  Bot, X, Search, Filter, ArrowUpDown
} from 'lucide-react';
import type { TestSession } from '@/lib/test-types';

interface ConversationHistoryProps {
  sessions: TestSession[];
  currentSessionId?: string;
  onLoadSession: (session: TestSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onShareSession: (session: TestSession) => string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ConversationHistory({
  sessions,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  onShareSession,
  isOpen,
  onToggle,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'messages' | 'cost'>('date');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredSessions = sessions
    .filter((session) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        session.agentName.toLowerCase().includes(query) ||
        session.messages.some((m) => m.content.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'messages':
          return b.messageCount - a.messageCount;
        case 'cost':
          return b.totalCost - a.totalCost;
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const handleShare = (session: TestSession) => {
    const shareUrl = onShareSession(session);
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (sessionId: string) => {
    if (deleteConfirm === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    }
    return d.toLocaleDateString();
  };

  const getPreview = (session: TestSession) => {
    const lastMessage = session.messages[session.messages.length - 1];
    if (!lastMessage) return 'No messages';
    const preview = lastMessage.content.slice(0, 60);
    return preview.length < lastMessage.content.length ? `${preview}...` : preview;
  };

  return (
    <motion.div
      className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden"
      initial={false}
      animate={{ height: isOpen ? 'auto' : 56 }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-orange-400" />
          <span className="text-sm font-semibold text-white">Test History</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
            {sessions.length}
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-white/50 transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Search and Filters */}
            <div className="px-4 pb-3 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="relative group">
                <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">
                  <ArrowUpDown className="w-4 h-4 text-white/50" />
                </button>
                <div className="absolute right-0 top-10 w-36 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition z-20">
                  {[
                    { value: 'date', label: 'Date' },
                    { value: 'messages', label: 'Messages' },
                    { value: 'cost', label: 'Cost' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as any)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition ${
                        sortBy === option.value
                          ? 'text-orange-400'
                          : 'text-white/70'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredSessions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">
                    {searchQuery ? 'No matching conversations' : 'No test history yet'}
                  </p>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-2">
                  {filteredSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      layout
                      className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                        currentSessionId === session.id
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                      onClick={() => onLoadSession(session)}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-white truncate">
                                {session.agentName}
                              </h4>
                              {session.agentVersion && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/40">
                                  v{session.agentVersion}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/40 truncate mt-0.5">
                              {getPreview(session)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(session);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition"
                            title="Copy share link"
                          >
                            {copiedId === session.id ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5 text-white/50" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(session.id);
                            }}
                            className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                              deleteConfirm === session.id
                                ? 'text-red-400'
                                : 'text-white/50'
                            }`}
                            title={
                              deleteConfirm === session.id
                                ? 'Click again to confirm'
                                : 'Delete'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {session.messageCount} msgs
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${session.totalCost.toFixed(4)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
