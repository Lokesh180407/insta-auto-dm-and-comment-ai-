import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: documents, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, content, url } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    if (type !== 'url' && !content) {
      return NextResponse.json({ error: 'Content is required for text documents' }, { status: 400 });
    }

    // Process chunking
    const chunks: string[] = [];
    if (content) {
      // Split by paragraph/newlines
      const paragraphs = content.split(/\n+/);
      let currentChunk = '';

      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;

        if ((currentChunk + '\n' + trimmed).length > 500) {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = trimmed;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n' + trimmed : trimmed;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
    }

    // Insert document
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        name,
        type,
        content: content || null,
        url: url || null,
        chunk_count: chunks.length
      })
      .select()
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: docError?.message || 'Failed to create document' }, { status: 500 });
    }

    // Insert chunks
    if (chunks.length > 0) {
      // Import dynamically to avoid circular dependencies or weird build issues if not needed globally here
      const { generateEmbedding } = await import('@/lib/ai');
      
      const embeddingsData = await Promise.all(
        chunks.map(async (chunk) => ({
          document_id: document.id,
          chunk_text: chunk,
          embedding: await generateEmbedding(chunk)
        }))
      );

      const { error: chunkError } = await supabase
        .from('embeddings')
        .insert(embeddingsData);

      if (chunkError) {
        return NextResponse.json({ error: chunkError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ document });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
