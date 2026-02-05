'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  FileText,
  Sparkles,
  Quote,
  Copy,
  Check,
  ExternalLink,
  Settings2,
  ChevronDown,
} from 'lucide-react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { SearchResult } from '@/lib/knowledge-types';

interface SearchTestProps {
  knowledgeBaseId: string;
}

export default function SearchTest({ knowledgeBaseId }: SearchTestProps) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.3);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const {
    searchResults,
    searchQuery,
    isSearching,
    setSearchResults,
    setSearchQuery,
    setIsSearching,
    documents,
  } = useKnowledgeStore();

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchQuery(query);
    
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          knowledgeBaseIds: [knowledgeBaseId],
          topK,
          minScore,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      performSearch();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDocumentName = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    return doc?.name || 'Unknown document';
  };

  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400 bg-green-500/20';
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-500/20';
    if (score >= 0.4) return 'text-orange-400 bg-orange-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your search query..."
            className="w-full pl-12 pr-24 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition"
          />
          <button
            onClick={performSearch}
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
        
        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
        >
          <Settings2 className="w-4 h-4" />
          Search settings
          <ChevronDown className={`w-4 h-4 transition ${showSettings ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Top K:</label>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500/50 outline-none"
                >
                  {[3, 5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n} results</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Min Score:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-white/60">{formatScore(minScore)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-orange-400 animate-spin" />
              <p className="text-white/50">Searching knowledge base...</p>
            </div>
          </motion.div>
        ) : searchResults.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </h3>
            </div>
            
            {searchResults.map((result, index) => (
              <motion.div
                key={result.chunk.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition"
              >
                {/* Result Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs font-mono">
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(result.score)}`}>
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {formatScore(result.score)} relevance
                    </span>
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(result.chunk.content, result.chunk.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
                    title="Copy"
                  >
                    {copiedId === result.chunk.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {/* Content */}
                <div className="relative mb-3">
                  <Quote className="absolute -left-1 -top-1 w-4 h-4 text-white/10" />
                  <p className="text-sm text-white/80 leading-relaxed pl-4">
                    {result.chunk.content}
                  </p>
                </div>
                
                {/* Source Citation */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <FileText className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/50">
                    {result.document?.name || getDocumentName(result.chunk.document_id)}
                  </span>
                  <span className="text-xs text-white/30">•</span>
                  <span className="text-xs text-white/40">
                    Chunk {result.chunk.position + 1}
                  </span>
                  {result.chunk.metadata?.page && (
                    <>
                      <span className="text-xs text-white/30">•</span>
                      <span className="text-xs text-white/40">
                        Page {result.chunk.metadata.page}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : searchQuery ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <Search className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <h3 className="text-lg font-medium text-white/60 mb-2">No results found</h3>
            <p className="text-sm text-white/40">
              Try adjusting your query or lowering the minimum score threshold
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <Search className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <h3 className="text-lg font-medium text-white/60 mb-2">Test your knowledge base</h3>
            <p className="text-sm text-white/40">
              Enter a query to search for similar content
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Queries */}
      {!searchQuery && (
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs text-white/40 mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'How do I get started?',
              'What are the main features?',
              'Pricing and plans',
              'API documentation',
            ].map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuery(example);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
