'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  File,
  FileSpreadsheet,
  Globe,
  Trash2,
  MoreVertical,
  Eye,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { Document, DocumentStatus, DocumentType } from '@/lib/knowledge-types';

const STATUS_CONFIG: Record<DocumentStatus, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: 'text-yellow-400 bg-yellow-500/20', icon: Clock, label: 'Pending' },
  processing: { color: 'text-blue-400 bg-blue-500/20', icon: Loader2, label: 'Processing' },
  chunked: { color: 'text-purple-400 bg-purple-500/20', icon: CheckCircle, label: 'Chunked' },
  embedded: { color: 'text-green-400 bg-green-500/20', icon: Sparkles, label: 'Embedded' },
  error: { color: 'text-red-400 bg-red-500/20', icon: AlertCircle, label: 'Error' },
};

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  txt: File,
  md: File,
  csv: FileSpreadsheet,
  webpage: Globe,
};

interface DocumentListProps {
  knowledgeBaseId: string;
  onSelectDocument?: (document: Document) => void;
  onViewChunks?: (document: Document) => void;
}

export default function DocumentList({ knowledgeBaseId, onSelectDocument, onViewChunks }: DocumentListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const {
    documents,
    deleteDocument,
    updateDocument,
    getChunksForDocument,
  } = useKnowledgeStore();

  const filteredDocuments = documents.filter((d) => d.knowledge_base_id === knowledgeBaseId);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const deleteSelected = async () => {
    for (const id of selectedIds) {
      deleteDocument(id);
    }
    setSelectedIds(new Set());
  };

  const processDocument = async (doc: Document) => {
    setIsProcessing(doc.id);
    setMenuOpen(null);
    
    try {
      // Call API to chunk and embed
      const response = await fetch('/api/knowledge/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          action: 'process',
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        updateDocument(doc.id, { status: result.status, chunk_count: result.chunkCount });
      }
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  const generateEmbeddings = async (doc: Document) => {
    setIsProcessing(doc.id);
    setMenuOpen(null);
    
    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          action: 'embed',
        }),
      });
      
      if (response.ok) {
        updateDocument(doc.id, { status: 'embedded' });
      }
    } catch (error) {
      console.error('Embedding error:', error);
    } finally {
      setIsProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (filteredDocuments.length === 0) {
    return (
      <div className="text-center py-12 text-white/40">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <h3 className="text-lg font-medium text-white/60 mb-2">No documents yet</h3>
        <p className="text-sm">Upload files or scrape websites to add documents</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with bulk actions */}
      {filteredDocuments.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-sm text-white/60 hover:text-white transition"
            >
              {selectedIds.size === filteredDocuments.length ? 'Deselect all' : 'Select all'}
            </button>
            {selectedIds.size > 0 && (
              <span className="text-sm text-white/40">
                {selectedIds.size} selected
              </span>
            )}
          </div>
          
          {selectedIds.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={deleteSelected}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </motion.button>
          )}
        </div>
      )}

      {/* Document List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredDocuments.map((doc, index) => {
            const TypeIcon = TYPE_ICONS[doc.type];
            const statusConfig = STATUS_CONFIG[doc.status];
            const StatusIcon = statusConfig.icon;
            const chunks = getChunksForDocument(doc.id);
            const isSelected = selectedIds.has(doc.id);
            const isCurrentlyProcessing = isProcessing === doc.id;
            
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border transition ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(doc.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition ${
                      isSelected
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {isSelected && <CheckCircle className="w-3 h-3" />}
                  </button>
                  
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="w-5 h-5 text-white/60" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium truncate">{doc.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className={`w-3 h-3 ${doc.status === 'processing' || isCurrentlyProcessing ? 'animate-spin' : ''}`} />
                        {isCurrentlyProcessing ? 'Processing...' : statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                      <span>{doc.type.toUpperCase()}</span>
                      <span>{formatSize(doc.metadata.fileSize)}</span>
                      <span>{doc.chunk_count || chunks.length} chunks</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewChunks?.(doc)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                      title="View chunks"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {/* More Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {menuOpen === doc.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-10 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden"
                          >
                            {(doc.status === 'pending' || doc.status === 'error') && (
                              <button
                                onClick={() => processDocument(doc)}
                                className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white transition flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Process & Chunk
                              </button>
                            )}
                            
                            {doc.status === 'chunked' && (
                              <button
                                onClick={() => generateEmbeddings(doc)}
                                className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white transition flex items-center gap-2"
                              >
                                <Sparkles className="w-4 h-4" />
                                Generate Embeddings
                              </button>
                            )}
                            
                            <button
                              onClick={() => onViewChunks?.(doc)}
                              className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white transition flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Chunks
                            </button>
                            
                            <button
                              onClick={() => {
                                deleteDocument(doc.id);
                                setMenuOpen(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
