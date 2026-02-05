// Knowledge Base Types for RAG System

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  document_count: number;
  chunk_count: number;
  embedding_model: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  knowledge_base_id: string;
  name: string;
  type: DocumentType;
  source: string; // file path or URL
  content: string;
  metadata: DocumentMetadata;
  status: DocumentStatus;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'webpage';
export type DocumentStatus = 'pending' | 'processing' | 'chunked' | 'embedded' | 'error';

export interface DocumentMetadata {
  fileSize?: number;
  pageCount?: number;
  wordCount?: number;
  url?: string;
  crawlDepth?: number;
  author?: string;
  title?: string;
  [key: string]: unknown;
}

export interface Chunk {
  id: string;
  document_id: string;
  knowledge_base_id: string;
  content: string;
  embedding: number[] | null;
  token_count: number;
  position: number; // Order within document
  metadata: ChunkMetadata;
  created_at: string;
}

export interface ChunkMetadata {
  page?: number;
  section?: string;
  startChar?: number;
  endChar?: number;
  [key: string]: unknown;
}

export interface SearchResult {
  chunk: Chunk;
  document: Document;
  score: number; // Cosine similarity score
  highlights?: string[];
}

export interface SearchQuery {
  query: string;
  knowledge_base_ids: string[];
  top_k: number;
  min_score?: number;
  include_metadata?: boolean;
}

export interface ChunkingConfig {
  chunkSize: number; // Target tokens per chunk
  chunkOverlap: number; // Overlap between chunks in tokens
  separators: string[]; // Text separators for splitting
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '. ', ' ', ''],
};

export interface EmbeddingConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
  batchSize: number;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 100,
};

export interface ScrapingConfig {
  url: string;
  depth: 1 | 2 | 3;
  maxPages: number;
  includePaths?: string[]; // URL patterns to include
  excludePaths?: string[]; // URL patterns to exclude
  waitForSelector?: string;
}

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  depth: number;
  links: string[];
  selected: boolean;
}

export interface UploadProgress {
  documentId: string;
  stage: 'uploading' | 'parsing' | 'chunking' | 'embedding';
  progress: number; // 0-100
  message: string;
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  embeddingProgress: number;
  storageUsed: number; // in bytes
}

// Agent integration types
export interface AgentKnowledgeConfig {
  agent_id: string;
  knowledge_base_ids: string[];
  enabled: boolean;
  search_top_k: number;
  min_relevance_score: number;
  include_sources: boolean;
}

export interface RAGContext {
  query: string;
  results: SearchResult[];
  formatted_context: string;
  sources: SourceCitation[];
}

export interface SourceCitation {
  document_name: string;
  chunk_position: number;
  relevance_score: number;
  excerpt: string;
}
