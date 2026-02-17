'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Database,
  Plus,
  FileText,
  Globe,
  Search,
  Settings,
  Sparkles,
  ChevronLeft,
  BarChart3,
  Trash2,
  Edit3,
  X,
  Loader2,
  BookOpen,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import DocumentUploader from '@/components/knowledge/DocumentUploader';
import WebsiteScraper from '@/components/knowledge/WebsiteScraper';
import DocumentList from '@/components/knowledge/DocumentList';
import ChunkViewer from '@/components/knowledge/ChunkViewer';
import SearchTest from '@/components/knowledge/SearchTest';
import type { KnowledgeBase, Document } from '@/lib/knowledge-types';

type TabType = 'upload' | 'scrape' | 'documents' | 'chunks' | 'search';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDescription, setNewKbDescription] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const {
    knowledgeBases,
    activeKnowledgeBaseId,
    documents,
    chunks,
    setActiveKnowledgeBase,
    addKnowledgeBase,
    deleteKnowledgeBase,
    getStats,
    getDocumentsForKnowledgeBase,
  } = useKnowledgeStore();

  // Get active knowledge base
  const activeKnowledgeBase = knowledgeBases.find(kb => kb.id === activeKnowledgeBaseId);
  const stats = activeKnowledgeBaseId ? getStats(activeKnowledgeBaseId) : null;

  // Create default knowledge base if none exists
  useEffect(() => {
    if (knowledgeBases.length === 0) {
      const defaultKb: KnowledgeBase = {
        id: crypto.randomUUID(),
        user_id: 'demo-user',
        name: 'My Knowledge Base',
        description: 'Default knowledge base',
        document_count: 0,
        chunk_count: 0,
        embedding_model: 'text-embedding-3-small',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addKnowledgeBase(defaultKb);
      setActiveKnowledgeBase(defaultKb.id);
    } else if (!activeKnowledgeBaseId) {
      setActiveKnowledgeBase(knowledgeBases[0].id);
    }
  }, [knowledgeBases, activeKnowledgeBaseId, addKnowledgeBase, setActiveKnowledgeBase]);

  const createKnowledgeBase = () => {
    if (!newKbName.trim()) return;
    
    setIsCreating(true);
    
    const newKb: KnowledgeBase = {
      id: crypto.randomUUID(),
      user_id: 'demo-user',
      name: newKbName.trim(),
      description: newKbDescription.trim() || null,
      document_count: 0,
      chunk_count: 0,
      embedding_model: 'text-embedding-3-small',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    addKnowledgeBase(newKb);
    setActiveKnowledgeBase(newKb.id);
    setNewKbName('');
    setNewKbDescription('');
    setShowCreateModal(false);
    setIsCreating(false);
  };

  const handleViewChunks = (document: Document) => {
    setSelectedDocument(document);
    setActiveTab('chunks');
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'upload', label: 'Upload', icon: Plus },
    { id: 'scrape', label: 'Scrape', icon: Globe },
    { id: 'chunks', label: 'Chunks', icon: BookOpen },
    { id: 'search', label: 'Search', icon: Search },
  ];

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
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <motion.div
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Flame className="w-6 h-6 text-white" />
                  </motion.div>
                </Link>
                
                <div className="flex items-center gap-2 text-white/50">
                  <ChevronLeft className="w-4 h-4" />
                  <Link href="/dashboard" className="hover:text-white transition">
                    Dashboard
                  </Link>
                </div>
                
                <div className="hidden md:flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-400" />
                  <h1 className="text-xl font-bold">Knowledge Base</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Knowledge Base Selector */}
                <select
                  value={activeKnowledgeBaseId || ''}
                  onChange={(e) => setActiveKnowledgeBase(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-orange-500/50 outline-none"
                >
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                </select>
                
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-orange-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-4 h-4" />
                  New KB
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Row */}
          {stats && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {[
                { label: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'blue' },
                { label: 'Chunks', value: stats.totalChunks, icon: BookOpen, color: 'purple' },
                { label: 'Tokens', value: stats.totalTokens.toLocaleString(), icon: BarChart3, color: 'green' },
                { label: 'Embedded', value: `${Math.round(stats.embeddingProgress)}%`, icon: Sparkles, color: 'yellow' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="p-4 rounded-xl bg-white/5 border border-white/5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/50">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'chunks') {
                    setSelectedDocument(null);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeKnowledgeBaseId && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 rounded-2xl border border-white/5 p-6"
              >
                {activeTab === 'documents' && (
                  <DocumentList
                    knowledgeBaseId={activeKnowledgeBaseId}
                    onViewChunks={handleViewChunks}
                  />
                )}
                
                {activeTab === 'upload' && (
                  <DocumentUploader
                    knowledgeBaseId={activeKnowledgeBaseId}
                    onUploadComplete={() => setActiveTab('documents')}
                  />
                )}
                
                {activeTab === 'scrape' && (
                  <WebsiteScraper
                    knowledgeBaseId={activeKnowledgeBaseId}
                    onScrapeComplete={() => setActiveTab('documents')}
                  />
                )}
                
                {activeTab === 'chunks' && (
                  <ChunkViewer
                    document={selectedDocument}
                    onClose={() => {
                      setSelectedDocument(null);
                      setActiveTab('documents');
                    }}
                  />
                )}
                
                {activeTab === 'search' && (
                  <SearchTest knowledgeBaseId={activeKnowledgeBaseId} />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agent Integration Section */}
          <motion.div
            className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-orange-500/10 border border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Connect to Your Agents
                </h3>
                <p className="text-white/60 text-sm mb-4">
                  Attach this knowledge base to your agents to enable RAG-powered responses. 
                  Agents will search this knowledge base for relevant context before responding.
                </p>
                <Link href="/dashboard">
                  <motion.button
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-2 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Settings className="w-4 h-4" />
                    Configure Agents
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Create Knowledge Base Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create Knowledge Base</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-2">Name</label>
                  <input
                    type="text"
                    value={newKbName}
                    onChange={(e) => setNewKbName(e.target.value)}
                    placeholder="My Knowledge Base"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-orange-500/50 outline-none"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="text-sm text-white/60 block mb-2">Description (optional)</label>
                  <textarea
                    value={newKbDescription}
                    onChange={(e) => setNewKbDescription(e.target.value)}
                    placeholder="Describe what this knowledge base contains..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-orange-500/50 outline-none resize-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createKnowledgeBase}
                  disabled={!newKbName.trim() || isCreating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
