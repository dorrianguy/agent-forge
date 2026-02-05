// Embedding Generation for RAG System
import OpenAI from 'openai';
import type {
  Chunk,
  ChunkingConfig,
  EmbeddingConfig,
} from './knowledge-types';
import {
  DEFAULT_CHUNKING_CONFIG,
  DEFAULT_EMBEDDING_CONFIG,
} from './knowledge-types';

// Initialize OpenAI client (uses OPENAI_API_KEY env var)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Approximate token count (rough estimate: ~4 chars per token for English)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// More accurate token estimation using simple word-based heuristic
export function countTokens(text: string): number {
  // Split on whitespace and punctuation
  const words = text.split(/\s+/).filter(Boolean);
  // Average ~1.3 tokens per word for English text
  return Math.ceil(words.length * 1.3);
}

// Text chunking with overlap
export function chunkText(
  text: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): { content: string; startChar: number; endChar: number }[] {
  const { chunkSize, chunkOverlap, separators } = config;
  const chunks: { content: string; startChar: number; endChar: number }[] = [];
  
  // Recursive text splitting
  function splitText(text: string, separatorIndex: number): string[] {
    if (separatorIndex >= separators.length) {
      return [text];
    }
    
    const separator = separators[separatorIndex];
    const parts = separator ? text.split(separator) : [text];
    
    const result: string[] = [];
    for (const part of parts) {
      const tokens = estimateTokens(part);
      if (tokens <= chunkSize) {
        result.push(part);
      } else {
        // Recursively split with next separator
        result.push(...splitText(part, separatorIndex + 1));
      }
    }
    
    return result;
  }
  
  // Split text into segments
  const segments = splitText(text, 0);
  
  // Combine segments into chunks with overlap
  let currentChunk = '';
  let currentStart = 0;
  let charPosition = 0;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment);
    const currentTokens = estimateTokens(currentChunk);
    
    if (currentTokens + segmentTokens <= chunkSize) {
      // Add to current chunk
      currentChunk += (currentChunk ? ' ' : '') + segment;
    } else {
      // Save current chunk if not empty
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          startChar: currentStart,
          endChar: charPosition,
        });
        
        // Calculate overlap for next chunk
        const overlapTokens = Math.min(chunkOverlap, estimateTokens(currentChunk));
        const words = currentChunk.split(/\s+/);
        const overlapWords = Math.ceil(overlapTokens / 1.3);
        const overlapText = words.slice(-overlapWords).join(' ');
        
        currentChunk = overlapText + ' ' + segment;
        currentStart = charPosition - overlapText.length;
      } else {
        currentChunk = segment;
        currentStart = charPosition;
      }
    }
    
    charPosition += segment.length + 1; // +1 for space
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      startChar: currentStart,
      endChar: text.length,
    });
  }
  
  return chunks;
}

// Generate embeddings for text using OpenAI
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG
): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: config.model,
    input: text,
    dimensions: config.dimensions,
  });
  
  return response.data[0].embedding;
}

// Generate embeddings for multiple texts in batches
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG,
  onProgress?: (completed: number, total: number) => void
): Promise<number[][]> {
  const embeddings: number[][] = [];
  const { batchSize, model, dimensions } = config;
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const response = await openai.embeddings.create({
      model,
      input: batch,
      dimensions,
    });
    
    for (const item of response.data) {
      embeddings.push(item.embedding);
    }
    
    onProgress?.(Math.min(i + batchSize, texts.length), texts.length);
  }
  
  return embeddings;
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find top K similar chunks using cosine similarity
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: Chunk[],
  topK: number = 5,
  minScore: number = 0
): { chunk: Chunk; score: number }[] {
  const results: { chunk: Chunk; score: number }[] = [];
  
  for (const chunk of chunks) {
    if (!chunk.embedding) continue;
    
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    if (score >= minScore) {
      results.push({ chunk, score });
    }
  }
  
  // Sort by score descending and take top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// Extract text from various file formats (client-side compatible)
export async function extractTextFromFile(
  file: File
): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const fileType = file.name.split('.').pop()?.toLowerCase();
  
  switch (fileType) {
    case 'txt':
    case 'md':
      return {
        text: await file.text(),
        metadata: { wordCount: (await file.text()).split(/\s+/).length },
      };
    
    case 'csv':
      const csvText = await file.text();
      // Convert CSV to readable format
      const lines = csvText.split('\n');
      const headers = lines[0]?.split(',') || [];
      const formattedText = lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.map((h, i) => `${h}: ${values[i] || ''}`).join(', ');
      }).join('\n');
      return {
        text: formattedText,
        metadata: { rowCount: lines.length - 1, columns: headers },
      };
    
    case 'pdf':
      // For PDFs, we'll handle this server-side with pdf-parse
      // This is a placeholder for client-side
      throw new Error('PDF parsing requires server-side processing');
    
    case 'docx':
      // For DOCX, we'll handle this server-side
      throw new Error('DOCX parsing requires server-side processing');
    
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// Format chunks for RAG context
export function formatChunksForContext(
  results: { chunk: Chunk; score: number }[],
  includeScores: boolean = false
): string {
  return results.map((r, i) => {
    const header = includeScores 
      ? `[Source ${i + 1}, relevance: ${(r.score * 100).toFixed(1)}%]`
      : `[Source ${i + 1}]`;
    return `${header}\n${r.chunk.content}`;
  }).join('\n\n---\n\n');
}

// Create RAG prompt with retrieved context
export function createRAGPrompt(
  query: string,
  context: string,
  systemPrompt?: string
): string {
  const defaultSystem = `You are a helpful assistant. Answer questions based on the provided context. If the context doesn't contain relevant information, say so.`;
  
  return `${systemPrompt || defaultSystem}

Context from knowledge base:
${context}

User question: ${query}

Please provide a helpful answer based on the context above. If citing specific information, mention which source it came from.`;
}
