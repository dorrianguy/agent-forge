import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings';
import type { SearchResult, SearchQuery, Chunk, Document } from '@/lib/knowledge-types';

// POST: Vector similarity search
export async function POST(request: NextRequest) {
  try {
    const body: SearchQuery & { chunks?: Chunk[]; documents?: Document[] } = await request.json();
    const { 
      query, 
      knowledgeBaseIds, 
      topK = 5, 
      minScore = 0.3,
      includeMetadata = true,
      chunks,
      documents,
    } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // For localStorage demo, chunks are passed from client
    // In production, fetch from Supabase with pgvector:
    /*
    const supabase = createClient();
    
    // Use Supabase's pgvector similarity search
    const { data: results, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: minScore,
      match_count: topK,
      filter_knowledge_base_ids: knowledgeBaseIds,
    });
    */
    
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
      });
    }
    
    // Filter chunks by knowledge base IDs
    let filteredChunks = chunks;
    if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
      filteredChunks = chunks.filter((c: Chunk) => 
        knowledgeBaseIds.includes(c.knowledge_base_id)
      );
    }
    
    // Filter to only chunks with embeddings
    const embeddedChunks = filteredChunks.filter((c: Chunk) => c.embedding && c.embedding.length > 0);
    
    if (embeddedChunks.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        message: 'No embedded chunks found. Please generate embeddings first.',
      });
    }
    
    // Calculate similarity scores
    const scoredChunks = embeddedChunks.map((chunk: Chunk) => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding!);
      return { chunk, score };
    });
    
    // Filter by minimum score
    const qualifiedChunks = scoredChunks.filter(({ score }) => score >= minScore);
    
    // Sort by score descending and take top K
    qualifiedChunks.sort((a, b) => b.score - a.score);
    const topChunks = qualifiedChunks.slice(0, topK);
    
    // Build results with document info
    const results: SearchResult[] = topChunks.map(({ chunk, score }) => {
      const document = documents?.find((d: Document) => d.id === chunk.document_id);
      
      return {
        chunk: includeMetadata ? chunk : {
          ...chunk,
          embedding: undefined, // Don't send full embedding back
        },
        document: document || {
          id: chunk.document_id,
          knowledge_base_id: chunk.knowledge_base_id,
          name: 'Unknown Document',
          type: 'txt',
          source: '',
          content: '',
          metadata: {},
          status: 'embedded',
          chunk_count: 0,
          created_at: '',
          updated_at: '',
        },
        score,
      };
    });
    
    return NextResponse.json({
      success: true,
      results,
      query,
      totalSearched: embeddedChunks.length,
      topK,
      minScore,
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

// GET: Test search endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/knowledge/search',
    methods: ['POST'],
    description: 'Vector similarity search for knowledge base chunks',
    parameters: {
      query: 'string (required) - Search query text',
      knowledgeBaseIds: 'string[] (optional) - Filter by knowledge base IDs',
      topK: 'number (optional, default: 5) - Number of results to return',
      minScore: 'number (optional, default: 0.3) - Minimum similarity score (0-1)',
      includeMetadata: 'boolean (optional, default: true) - Include chunk metadata',
      chunks: 'Chunk[] (required for demo) - Chunks to search through',
      documents: 'Document[] (optional) - Documents for source info',
    },
  });
}
