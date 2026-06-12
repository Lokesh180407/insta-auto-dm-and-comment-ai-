import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: broadcasts, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ broadcasts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, message, scheduled_at, audience_filter } = body;

    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required' }, { status: 400 });
    }

    const status = scheduled_at ? 'scheduled' : 'draft';

    // Insert broadcast
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        name,
        message,
        status,
        scheduled_at: scheduled_at || null,
        audience_filter: audience_filter || {}
      })
      .select()
      .single();

    if (broadcastError || !broadcast) {
      return NextResponse.json({ error: broadcastError?.message || 'Failed to create broadcast' }, { status: 500 });
    }

    // Resolve audience (contacts)
    let contactsQuery = supabase.from('contacts').select('igsid');
    
    if (audience_filter) {
      if (audience_filter.tag) {
        // Since tags is TEXT[] in contacts:
        contactsQuery = contactsQuery.contains('tags', [audience_filter.tag]);
      }
      if (audience_filter.followers_only) {
        contactsQuery = contactsQuery.eq('is_user_follow_business', true);
      }
    }

    const { data: contacts, error: contactsError } = await contactsQuery;
    
    if (contactsError) {
      return NextResponse.json({ error: contactsError.message }, { status: 500 });
    }

    // Create recipients
    if (contacts && contacts.length > 0) {
      const recipients = contacts.map(c => ({
        broadcast_id: broadcast.id,
        igsid: c.igsid,
        status: 'pending'
      }));

      const { error: recipientsError } = await supabase
        .from('broadcast_recipients')
        .insert(recipients);

      if (recipientsError) {
        return NextResponse.json({ error: recipientsError.message }, { status: 500 });
      }
    }

    // If it's not scheduled, or scheduled for now, create a background job to process it
    if (!scheduled_at) {
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          type: 'broadcast',
          payload: { broadcast_id: broadcast.id },
          status: 'pending',
          next_run_at: new Date().toISOString()
        });

      if (jobError) {
        console.error('Failed to queue broadcast job:', jobError.message);
      }
    }

    return NextResponse.json({ broadcast, recipientCount: contacts?.length || 0 });
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
      return NextResponse.json({ error: 'Broadcast ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('broadcasts')
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
