'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Link2,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import type { ScrapedPage, Document } from '@/lib/knowledge-types';

interface WebsiteScraperProps {
  knowledgeBaseId: string;
  onScrapeComplete?: (documents: Document[]) => void;
}

export default function WebsiteScraper({ knowledgeBaseId, onScrapeComplete }: WebsiteScraperProps) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState<1 | 2 | 3>(1);
  const [maxPages, setMaxPages] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    scrapedPages,
    scrapingInProgress,
    setScrapedPages,
    togglePageSelection,
    setScrapingInProgress,
    clearScrapedPages,
    addDocument,
  } = useKnowledgeStore();

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const startScraping = async () => {
    if (!url || !isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }
    
    setError(null);
    setScrapingInProgress(true);
    clearScrapedPages();
    
    try {
      const response = await fetch('/api/knowledge/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          depth,
          maxPages,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping failed');
      }
      
      const result = await response.json();
      
      // Mark all pages as selected by default
      const pagesWithSelection: ScrapedPage[] = result.pages.map((page: ScrapedPage) => ({
        ...page,
        selected: true,
      }));
      
      setScrapedPages(pagesWithSelection);
    } catch (err) {
      console.error('Scraping error:', err);
      setError(err instanceof Error ? err.message : 'Scraping failed');
    } finally {
      setScrapingInProgress(false);
    }
  };

  const saveSelectedPages = async () => {
    const selectedPages = scrapedPages.filter((p) => p.selected);
    if (selectedPages.length === 0) return;
    
    setIsSaving(true);
    const savedDocuments: Document[] = [];
    
    try {
      for (const page of selectedPages) {
        const response = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knowledgeBaseId,
            type: 'webpage',
            name: page.title || new URL(page.url).pathname,
            content: page.content,
            source: page.url,
            metadata: {
              url: page.url,
              crawlDepth: page.depth,
            },
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          addDocument(result.document);
          savedDocuments.push(result.document);
        }
      }
      
      clearScrapedPages();
      setUrl('');
      onScrapeComplete?.(savedDocuments);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save some pages');
    } finally {
      setIsSaving(false);
    }
  };

  const selectAll = () => {
    const allSelected = scrapedPages.every((p) => p.selected);
    const newPages = scrapedPages.map((p) => ({ ...p, selected: !allSelected }));
    setScrapedPages(newPages);
  };

  const selectedCount = scrapedPages.filter((p) => p.selected).length;

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-3">
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="https://example.com"
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition"
          />
        </div>
        
        {/* Settings Row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60">Depth:</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value) as 1 | 2 | 3)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500/50 outline-none"
            >
              <option value={1}>1 level</option>
              <option value={2}>2 levels</option>
              <option value={3}>3 levels</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60">Max pages:</label>
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500/50 outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <motion.button
            onClick={startScraping}
            disabled={scrapingInProgress || !url}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 ml-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {scrapingInProgress ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Scrape
              </>
            )}
          </motion.button>
        </div>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.p>
        )}
      </div>

      {/* Scraped Pages */}
      <AnimatePresence>
        {scrapedPages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium">
                  Scraped Pages ({scrapedPages.length})
                </h3>
                <span className="text-white/50 text-sm">
                  {selectedCount} selected
                </span>
              </div>
              <button
                onClick={selectAll}
                className="text-sm text-orange-400 hover:text-orange-300 transition"
              >
                {scrapedPages.every((p) => p.selected) ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            
            {/* Page List */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {scrapedPages.map((page, index) => (
                <motion.div
                  key={page.url}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    page.selected
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                  onClick={() => togglePageSelection(page.url)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      page.selected
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-transparent'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-white/40 flex-shrink-0" />
                        <p className="text-sm font-medium text-white truncate">
                          {page.title || 'Untitled'}
                        </p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                          Depth {page.depth}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 truncate mt-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {page.url}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {page.content.length.toLocaleString()} characters
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={saveSelectedPages}
                disabled={selectedCount === 0 || isSaving}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Save {selectedCount} page(s)
                  </>
                )}
              </motion.button>
              
              <motion.button
                onClick={clearScrapedPages}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Trash2 className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!scrapingInProgress && scrapedPages.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Enter a URL and click Scrape to crawl web pages</p>
        </div>
      )}
    </div>
  );
}
