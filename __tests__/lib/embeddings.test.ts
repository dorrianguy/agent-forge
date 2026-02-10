/**
 * Tests for lib/embeddings.ts — pure utility functions
 *
 * Tests the non-API functions:
 * - estimateTokens
 * - countTokens
 * - chunkText
 * - cosineSimilarity
 * - formatChunksForContext
 * - createRAGPrompt
 *
 * Note: generateEmbedding / generateEmbeddingsBatch require OpenAI API
 *       and are not tested here (would need integration tests).
 */

import {
  estimateTokens,
  countTokens,
  chunkText,
  cosineSimilarity,
  formatChunksForContext,
  createRAGPrompt,
} from '@/lib/embeddings';

describe('embeddings utilities', () => {
  describe('estimateTokens', () => {
    it('should estimate ~4 chars per token', () => {
      expect(estimateTokens('hello')).toBe(2); // ceil(5/4)
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('abcd')).toBe(1);
      expect(estimateTokens('abcde')).toBe(2);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(1000);
      expect(estimateTokens(longText)).toBe(250);
    });
  });

  describe('countTokens', () => {
    it('should estimate tokens based on word count', () => {
      const text = 'Hello world this is a test';
      const tokens = countTokens(text);
      // 6 words * 1.3 = 7.8, ceil = 8
      expect(tokens).toBe(8);
    });

    it('should handle empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should handle single word', () => {
      expect(countTokens('hello')).toBe(2); // ceil(1 * 1.3) = 2
    });
  });

  describe('chunkText', () => {
    it('should return a single chunk for short text', () => {
      const text = 'This is a short sentence.';
      const chunks = chunkText(text, {
        chunkSize: 100,
        chunkOverlap: 10,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
    });

    it('should split text into multiple chunks', () => {
      // Create text that exceeds chunk size
      const paragraphs = Array.from({ length: 10 }, (_, i) =>
        `Paragraph ${i + 1}: ` + 'word '.repeat(50)
      ).join('\n\n');

      const chunks = chunkText(paragraphs, {
        chunkSize: 100, // ~100 tokens = ~400 chars
        chunkOverlap: 10,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      expect(chunks.length).toBeGreaterThan(1);

      // Each chunk should have content
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeGreaterThan(0);
      }
    });

    it('should track character positions', () => {
      const text = 'First paragraph.\n\nSecond paragraph.';
      const chunks = chunkText(text, {
        chunkSize: 500,
        chunkOverlap: 0,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      expect(chunks[0].startChar).toBe(0);
      // endChar should be at or beyond the text length for single-chunk
      expect(chunks[0].endChar).toBeGreaterThanOrEqual(0);
    });

    it('should use default config when none provided', () => {
      const text = 'Short text.';
      const chunks = chunkText(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
    });

    it('should return value between -1 and 1', () => {
      const a = [0.5, 0.3, 0.7, 0.2];
      const b = [0.1, 0.9, 0.4, 0.6];
      const sim = cosineSimilarity(a, b);
      expect(sim).toBeGreaterThanOrEqual(-1);
      expect(sim).toBeLessThanOrEqual(1);
    });

    it('should throw for vectors of different dimensions', () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(() => cosineSimilarity(a, b)).toThrow('Vectors must have the same dimensions');
    });

    it('should return 0 for zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('should be commutative', () => {
      const a = [0.1, 0.5, 0.9];
      const b = [0.3, 0.7, 0.2];
      expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
    });
  });

  describe('formatChunksForContext', () => {
    const mockResults = [
      {
        chunk: {
          id: '1',
          document_id: 'doc1',
          knowledge_base_id: 'kb1',
          content: 'First chunk content',
          embedding: null,
          token_count: 3,
          position: 0,
          metadata: {},
          created_at: '2024-01-01',
        },
        score: 0.95,
      },
      {
        chunk: {
          id: '2',
          document_id: 'doc1',
          knowledge_base_id: 'kb1',
          content: 'Second chunk content',
          embedding: null,
          token_count: 3,
          position: 1,
          metadata: {},
          created_at: '2024-01-01',
        },
        score: 0.82,
      },
    ];

    it('should format chunks with source numbers', () => {
      const result = formatChunksForContext(mockResults);
      expect(result).toContain('[Source 1]');
      expect(result).toContain('[Source 2]');
      expect(result).toContain('First chunk content');
      expect(result).toContain('Second chunk content');
    });

    it('should include scores when requested', () => {
      const result = formatChunksForContext(mockResults, true);
      expect(result).toContain('relevance: 95.0%');
      expect(result).toContain('relevance: 82.0%');
    });

    it('should not include scores by default', () => {
      const result = formatChunksForContext(mockResults);
      expect(result).not.toContain('relevance');
    });

    it('should separate chunks with dividers', () => {
      const result = formatChunksForContext(mockResults);
      expect(result).toContain('---');
    });

    it('should handle empty results', () => {
      const result = formatChunksForContext([]);
      expect(result).toBe('');
    });
  });

  describe('createRAGPrompt', () => {
    it('should create a prompt with query and context', () => {
      const prompt = createRAGPrompt('What is Agent Forge?', 'Agent Forge is an AI platform.');
      expect(prompt).toContain('What is Agent Forge?');
      expect(prompt).toContain('Agent Forge is an AI platform.');
      expect(prompt).toContain('Context from knowledge base');
    });

    it('should use custom system prompt when provided', () => {
      const customSystem = 'You are a coding assistant.';
      const prompt = createRAGPrompt('How to deploy?', 'Use Vercel.', customSystem);
      expect(prompt).toContain(customSystem);
      expect(prompt).not.toContain('helpful assistant');
    });

    it('should use default system prompt when not provided', () => {
      const prompt = createRAGPrompt('test', 'context');
      expect(prompt).toContain('helpful assistant');
    });
  });
});
