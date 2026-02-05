// Zustand Store for Knowledge Base State
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  KnowledgeBase,
  Document,
  Chunk,
  SearchResult,
  ChunkingConfig,
  ScrapedPage,
  UploadProgress,
  KnowledgeBaseStats,
  DEFAULT_CHUNKING_CONFIG,
} from '@/lib/knowledge-types';

interface KnowledgeState {
  // Data
  knowledgeBases: KnowledgeBase[];
  documents: Document[];
  chunks: Chunk[];
  
  // Current selections
  activeKnowledgeBaseId: string | null;
  selectedDocumentIds: string[];
  selectedChunkId: string | null;
  
  // Scraping state
  scrapedPages: ScrapedPage[];
  scrapingInProgress: boolean;
  
  // Upload progress
  uploadProgress: Record<string, UploadProgress>;
  
  // Search state
  searchResults: SearchResult[];
  searchQuery: string;
  isSearching: boolean;
  
  // Chunking config
  chunkingConfig: ChunkingConfig;
  
  // Actions
  setKnowledgeBases: (bases: KnowledgeBase[]) => void;
  addKnowledgeBase: (base: KnowledgeBase) => void;
  updateKnowledgeBase: (id: string, updates: Partial<KnowledgeBase>) => void;
  deleteKnowledgeBase: (id: string) => void;
  
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  
  setChunks: (chunks: Chunk[]) => void;
  addChunks: (chunks: Chunk[]) => void;
  updateChunk: (id: string, updates: Partial<Chunk>) => void;
  deleteChunk: (id: string) => void;
  deleteChunksForDocument: (documentId: string) => void;
  
  setActiveKnowledgeBase: (id: string | null) => void;
  setSelectedDocuments: (ids: string[]) => void;
  setSelectedChunk: (id: string | null) => void;
  
  setScrapedPages: (pages: ScrapedPage[]) => void;
  togglePageSelection: (url: string) => void;
  setScrapingInProgress: (inProgress: boolean) => void;
  clearScrapedPages: () => void;
  
  setUploadProgress: (documentId: string, progress: UploadProgress | null) => void;
  clearUploadProgress: () => void;
  
  setSearchResults: (results: SearchResult[]) => void;
  setSearchQuery: (query: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  
  setChunkingConfig: (config: Partial<ChunkingConfig>) => void;
  
  // Computed getters
  getDocumentsForKnowledgeBase: (kbId: string) => Document[];
  getChunksForDocument: (docId: string) => Chunk[];
  getStats: (kbId: string) => KnowledgeBaseStats;
}

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set, get) => ({
      // Initial state
      knowledgeBases: [],
      documents: [],
      chunks: [],
      activeKnowledgeBaseId: null,
      selectedDocumentIds: [],
      selectedChunkId: null,
      scrapedPages: [],
      scrapingInProgress: false,
      uploadProgress: {},
      searchResults: [],
      searchQuery: '',
      isSearching: false,
      chunkingConfig: {
        chunkSize: 500,
        chunkOverlap: 50,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      },

      // Knowledge Base actions
      setKnowledgeBases: (bases) => set({ knowledgeBases: bases }),
      
      addKnowledgeBase: (base) => set((state) => ({
        knowledgeBases: [...state.knowledgeBases, base],
      })),
      
      updateKnowledgeBase: (id, updates) => set((state) => ({
        knowledgeBases: state.knowledgeBases.map((kb) =>
          kb.id === id ? { ...kb, ...updates } : kb
        ),
      })),
      
      deleteKnowledgeBase: (id) => set((state) => ({
        knowledgeBases: state.knowledgeBases.filter((kb) => kb.id !== id),
        documents: state.documents.filter((d) => d.knowledge_base_id !== id),
        chunks: state.chunks.filter((c) => c.knowledge_base_id !== id),
        activeKnowledgeBaseId: state.activeKnowledgeBaseId === id ? null : state.activeKnowledgeBaseId,
      })),

      // Document actions
      setDocuments: (docs) => set({ documents: docs }),
      
      addDocument: (doc) => set((state) => ({
        documents: [...state.documents, doc],
      })),
      
      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
      })),
      
      deleteDocument: (id) => set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        chunks: state.chunks.filter((c) => c.document_id !== id),
        selectedDocumentIds: state.selectedDocumentIds.filter((did) => did !== id),
      })),

      // Chunk actions
      setChunks: (chunks) => set({ chunks }),
      
      addChunks: (newChunks) => set((state) => ({
        chunks: [...state.chunks, ...newChunks],
      })),
      
      updateChunk: (id, updates) => set((state) => ({
        chunks: state.chunks.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),
      
      deleteChunk: (id) => set((state) => ({
        chunks: state.chunks.filter((c) => c.id !== id),
        selectedChunkId: state.selectedChunkId === id ? null : state.selectedChunkId,
      })),
      
      deleteChunksForDocument: (documentId) => set((state) => ({
        chunks: state.chunks.filter((c) => c.document_id !== documentId),
      })),

      // Selection actions
      setActiveKnowledgeBase: (id) => set({ 
        activeKnowledgeBaseId: id,
        selectedDocumentIds: [],
        selectedChunkId: null,
      }),
      
      setSelectedDocuments: (ids) => set({ selectedDocumentIds: ids }),
      
      setSelectedChunk: (id) => set({ selectedChunkId: id }),

      // Scraping actions
      setScrapedPages: (pages) => set({ scrapedPages: pages }),
      
      togglePageSelection: (url) => set((state) => ({
        scrapedPages: state.scrapedPages.map((p) =>
          p.url === url ? { ...p, selected: !p.selected } : p
        ),
      })),
      
      setScrapingInProgress: (inProgress) => set({ scrapingInProgress: inProgress }),
      
      clearScrapedPages: () => set({ scrapedPages: [], scrapingInProgress: false }),

      // Upload progress actions
      setUploadProgress: (documentId, progress) => set((state) => {
        const newProgress = { ...state.uploadProgress };
        if (progress === null) {
          delete newProgress[documentId];
        } else {
          newProgress[documentId] = progress;
        }
        return { uploadProgress: newProgress };
      }),
      
      clearUploadProgress: () => set({ uploadProgress: {} }),

      // Search actions
      setSearchResults: (results) => set({ searchResults: results }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setIsSearching: (isSearching) => set({ isSearching }),

      // Config actions
      setChunkingConfig: (config) => set((state) => ({
        chunkingConfig: { ...state.chunkingConfig, ...config },
      })),

      // Computed getters
      getDocumentsForKnowledgeBase: (kbId) => {
        return get().documents.filter((d) => d.knowledge_base_id === kbId);
      },
      
      getChunksForDocument: (docId) => {
        return get().chunks.filter((c) => c.document_id === docId);
      },
      
      getStats: (kbId) => {
        const docs = get().documents.filter((d) => d.knowledge_base_id === kbId);
        const kbChunks = get().chunks.filter((c) => c.knowledge_base_id === kbId);
        const embeddedChunks = kbChunks.filter((c) => c.embedding !== null);
        
        return {
          totalDocuments: docs.length,
          totalChunks: kbChunks.length,
          totalTokens: kbChunks.reduce((sum, c) => sum + c.token_count, 0),
          embeddingProgress: kbChunks.length > 0 
            ? (embeddedChunks.length / kbChunks.length) * 100 
            : 0,
          storageUsed: kbChunks.reduce((sum, c) => sum + c.content.length, 0),
        };
      },
    }),
    {
      name: 'knowledge-store',
      partialize: (state) => ({
        // Only persist essential data, not transient UI state
        knowledgeBases: state.knowledgeBases,
        documents: state.documents,
        chunks: state.chunks,
        chunkingConfig: state.chunkingConfig,
      }),
    }
  )
);
