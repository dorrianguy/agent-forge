import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chunkText, generateEmbeddingsBatch, estimateTokens } from '@/lib/embeddings';
import { logger } from '@/lib/logger';
import type { Document, Chunk, DocumentType, ChunkingConfig } from '@/lib/knowledge-types';

async function requireAuth() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// POST: Upload and process a new document
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    
    let documentData: {
      knowledgeBaseId: string;
      name: string;
      type: DocumentType;
      content: string;
      source: string;
      metadata?: Record<string, unknown>;
    };
    
    // Handle file upload (multipart form data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const knowledgeBaseId = formData.get('knowledgeBaseId') as string;
      
      if (!file || !knowledgeBaseId) {
        return NextResponse.json(
          { error: 'File and knowledgeBaseId are required' },
          { status: 400 }
        );
      }
      
      // Extract text based on file type
      const fileName = file.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase() as DocumentType;
      let content = '';
      let metadata: Record<string, unknown> = {
        fileSize: file.size,
        originalName: fileName,
      };
      
      // Process based on file type
      switch (fileExt) {
        case 'txt':
        case 'md':
          content = await file.text();
          break;
        
        case 'csv':
          const csvText = await file.text();
          // Convert CSV to readable format
          const lines = csvText.split('\n');
          const headers = lines[0]?.split(',') || [];
          content = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.map((h, i) => `${h.trim()}: ${values[i]?.trim() || ''}`).join(', ');
          }).join('\n');
          metadata.rowCount = lines.length - 1;
          metadata.columns = headers;
          break;
        
        case 'pdf':
          // For PDFs, we'd use pdf-parse library
          // Since it requires server-side Node.js, we'll store the raw content
          // and process it separately or use a different approach
          const pdfArrayBuffer = await file.arrayBuffer();
          // Placeholder: In production, use pdf-parse or similar
          content = `[PDF document: ${fileName}]\n\nNote: PDF text extraction requires additional processing.`;
          metadata.pageCount = 0; // Would be extracted from PDF
          break;
        
        case 'docx':
          // Similar to PDF, DOCX requires specialized parsing
          content = `[DOCX document: ${fileName}]\n\nNote: DOCX text extraction requires additional processing.`;
          break;
        
        default:
          // Try to read as text
          try {
            content = await file.text();
          } catch {
            return NextResponse.json(
              { error: `Unsupported file type: ${fileExt}` },
              { status: 400 }
            );
          }
      }
      
      metadata.wordCount = content.split(/\s+/).length;
      
      documentData = {
        knowledgeBaseId,
        name: fileName,
        type: fileExt || 'txt',
        content,
        source: `upload://${fileName}`,
        metadata,
      };
      
    } else {
      // Handle JSON body (for webpage content or programmatic upload)
      documentData = await request.json();
    }
    
    const { knowledgeBaseId, name, type, content, source, metadata = {} } = documentData;
    
    if (!knowledgeBaseId || !name || !content) {
      return NextResponse.json(
        { error: 'knowledgeBaseId, name, and content are required' },
        { status: 400 }
      );
    }
    
    // Create document record
    const document: Document = {
      id: crypto.randomUUID(),
      knowledge_base_id: knowledgeBaseId,
      name,
      type: type || 'txt',
      source: source || `upload://${name}`,
      content,
      metadata,
      status: 'pending',
      chunk_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // For localStorage demo, return the document
    // In production, save to Supabase:
    // const supabase = createClient();
    // const { data, error } = await supabase.from('documents').insert(document).select().single();
    
    return NextResponse.json({
      success: true,
      document,
    });
    
  } catch (error) {
    logger.error('Document upload error', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// PUT: Process document (chunk, embed, or rechunk)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, action, chunkingConfig } = body;
    
    if (!documentId || !action) {
      return NextResponse.json(
        { error: 'documentId and action are required' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'process':
      case 'rechunk': {
        // Get document content (from localStorage or DB)
        // For demo, we expect content to be passed
        const { content, knowledgeBaseId } = body;
        
        if (!content) {
          return NextResponse.json(
            { error: 'Content is required for processing' },
            { status: 400 }
          );
        }
        
        // Chunk the content
        const config: ChunkingConfig = chunkingConfig || {
          chunkSize: 500,
          chunkOverlap: 50,
          separators: ['\n\n', '\n', '. ', ' ', ''],
        };
        
        const chunkData = chunkText(content, config);
        
        // Create chunk records
        const chunks: Chunk[] = chunkData.map((chunk, index) => ({
          id: crypto.randomUUID(),
          document_id: documentId,
          knowledge_base_id: knowledgeBaseId,
          content: chunk.content,
          embedding: null,
          token_count: estimateTokens(chunk.content),
          position: index,
          metadata: {
            startChar: chunk.startChar,
            endChar: chunk.endChar,
          },
          created_at: new Date().toISOString(),
        }));
        
        return NextResponse.json({
          success: true,
          status: 'chunked',
          chunkCount: chunks.length,
          chunks,
        });
      }
      
      case 'embed': {
        // Get chunks for document
        const { chunks } = body;
        
        if (!chunks || chunks.length === 0) {
          return NextResponse.json(
            { error: 'Chunks are required for embedding' },
            { status: 400 }
          );
        }
        
        // Generate embeddings
        const texts = chunks.map((c: Chunk) => c.content);
        const embeddings = await generateEmbeddingsBatch(texts);
        
        // Update chunks with embeddings
        const embeddedChunks = chunks.map((chunk: Chunk, index: number) => ({
          ...chunk,
          embedding: embeddings[index],
        }));
        
        return NextResponse.json({
          success: true,
          status: 'embedded',
          chunks: embeddedChunks,
        });
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    logger.error('Document processing error', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }
    
    // For localStorage demo, just return success
    // In production, delete from Supabase:
    // const supabase = createClient();
    // await supabase.from('chunks').delete().eq('document_id', documentId);
    // await supabase.from('documents').delete().eq('id', documentId);
    
    return NextResponse.json({
      success: true,
      deleted: documentId,
    });
    
  } catch (error) {
    logger.error('Document deletion error', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
