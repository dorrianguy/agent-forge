'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Hash,
  Copy,
  Check,
  RefreshCw,
  Settings2,
  Loader2,
} from 'lucide-react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { Document, Chunk, ChunkingConfig } from '@/lib/knowledge-types';
import { estimateTokens } from '@/lib/embeddings';

interface ChunkViewerProps {
  document: Document | null;
  onClose?: () => void;
}

export default function ChunkViewer({ document, onClose }: ChunkViewerProps) {
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showRechunkModal, setShowRechunkModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRechunking, setIsRechunking] = useState(false);
  const [page, setPage] = useState(0);
  const chunksPerPage = 10;
  
  const {
    chunks,
    chunkingConfig,
    setChunkingConfig,
    updateChunk,
    deleteChunk,
    getChunksForDocument,
    deleteChunksForDocument,
    addChunks,
  } = useKnowledgeStore();

  const documentChunks = document ? getChunksForDocument(document.id) : [];
  const totalPages = Math.ceil(documentChunks.length / chunksPerPage);
  const visibleChunks = documentChunks.slice(page * chunksPerPage, (page + 1) * chunksPerPage);

  // Reset page when document changes
  useEffect(() => {
    setPage(0);
  }, [document?.id]);

  const startEditing = (chunk: Chunk) => {
    setEditingChunkId(chunk.id);
    setEditContent(chunk.content);
  };

  const saveEdit = () => {
    if (editingChunkId) {
      const newTokenCount = estimateTokens(editContent);
      updateChunk(editingChunkId, { 
        content: editContent,
        token_count: newTokenCount,
        // Clear embedding since content changed
        embedding: null,
      });
      setEditingChunkId(null);
      setEditContent('');
    }
  };

  const cancelEdit = () => {
    setEditingChunkId(null);
    setEditContent('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const rechunkDocument = async () => {
    if (!document) return;
    
    setIsRechunking(true);
    
    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          action: 'rechunk',
          chunkingConfig,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        // Remove old chunks and add new ones
        deleteChunksForDocument(document.id);
        addChunks(result.chunks);
      }
    } catch (error) {
      console.error('Rechunk error:', error);
    } finally {
      setIsRechunking(false);
      setShowRechunkModal(false);
    }
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-96 text-white/40">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Select a document to view its chunks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{document.name}</h3>
            <p className="text-sm text-white/50">
              {documentChunks.length} chunks · {documentChunks.reduce((sum, c) => sum + c.token_count, 0).toLocaleString()} tokens
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowRechunkModal(true)}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition flex items-center gap-2 text-sm"
        >
          <Settings2 className="w-4 h-4" />
          Re-chunk
        </button>
      </div>

      {/* Chunks */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleChunks.map((chunk, index) => {
            const isEditing = editingChunkId === chunk.id;
            const globalIndex = page * chunksPerPage + index;
            
            return (
              <motion.div
                key={chunk.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl border transition ${
                  isEditing
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                {/* Chunk Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs font-mono">
                      #{globalIndex + 1}
                    </span>
                    <span className="text-xs text-white/40">
                      {chunk.token_count} tokens
                    </span>
                    {chunk.embedding && (
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Embedded
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => copyToClipboard(chunk.content, chunk.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                          title="Copy"
                        >
                          {copiedId === chunk.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(chunk)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteChunk(chunk.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Chunk Content */}
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-40 p-3 rounded-lg bg-black/30 border border-white/10 text-white text-sm font-mono resize-y focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-white/70 whitespace-pre-wrap line-clamp-6">
                    {chunk.content}
                  </p>
                )}
                
                {/* Metadata */}
                {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chunk.metadata.page && (
                      <span className="text-xs text-white/40">
                        Page {chunk.metadata.page}
                      </span>
                    )}
                    {chunk.metadata.section && (
                      <span className="text-xs text-white/40">
                        {chunk.metadata.section}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                  page === i
                    ? 'bg-orange-500 text-white'
                    : 'hover:bg-white/10 text-white/60'
                }`}
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, page - 2), Math.min(totalPages, page + 3))}
          </div>
          
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Re-chunk Modal */}
      <AnimatePresence>
        {showRechunkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowRechunkModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Re-chunk Document</h3>
              
              <div className="space-y-4">
                {/* Chunk Size */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">
                    Chunk Size (tokens)
                  </label>
                  <input
                    type="number"
                    value={chunkingConfig.chunkSize}
                    onChange={(e) => setChunkingConfig({ chunkSize: Number(e.target.value) })}
                    min={100}
                    max={2000}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-orange-500/50 outline-none"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Recommended: 500-1000 tokens per chunk
                  </p>
                </div>
                
                {/* Chunk Overlap */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">
                    Chunk Overlap (tokens)
                  </label>
                  <input
                    type="number"
                    value={chunkingConfig.chunkOverlap}
                    onChange={(e) => setChunkingConfig({ chunkOverlap: Number(e.target.value) })}
                    min={0}
                    max={500}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-orange-500/50 outline-none"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Overlap helps maintain context between chunks
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRechunkModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={rechunkDocument}
                  disabled={isRechunking}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRechunking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Re-chunk
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
