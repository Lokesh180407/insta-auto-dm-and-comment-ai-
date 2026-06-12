import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendInstagramMessage, sendPrivateReply } from '@/lib/instagram';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: failedJobs } = await supabase
      .from('failed_jobs')
      .select('*')
      .order('failed_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ jobs, failedJobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const now = new Date().toISOString();
    
    // 1. Fetch up to 10 pending jobs that are due
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('next_run_at', now)
      .limit(10);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending jobs to process' });
    }

    const results = [];

    for (const job of pendingJobs) {
      // 2. Concurrency guard: update status to 'running' only if it is still 'pending'
      const { data: claimData, error: claimError } = await supabase
        .from('jobs')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'pending')
        .select();

      if (claimError || !claimData || claimData.length === 0) {
        // Job was claimed by another worker run
        continue;
      }

      let jobSuccess = false;
      let jobErrorMsg = '';

      try {
        if (job.type === 'send_dm') {
          const { recipient_id, text } = job.payload;
          if (!recipient_id || !text) {
            throw new Error('Recipient ID and text are required in payload');
          }
          await sendInstagramMessage(recipient_id, text);
          jobSuccess = true;
        } else if (job.type === 'send_comment_reply') {
          const { comment_id, message } = job.payload;
          const accessToken = (process.env.INSTAGRAM_ACCESS_TOKEN ?? '').trim();
          if (!comment_id || !message) {
            throw new Error('Comment ID and message are required in payload');
          }
          await sendPrivateReply(accessToken, '', comment_id, message);
          jobSuccess = true;
        } else if (job.type === 'broadcast') {
          const { broadcast_id } = job.payload;
          if (!broadcast_id) {
            throw new Error('Broadcast ID is required in payload');
          }

          // Fetch pending recipients
          const { data: recipients, error: recError } = await supabase
            .from('broadcast_recipients')
            .select('id, igsid')
            .eq('broadcast_id', broadcast_id)
            .eq('status', 'pending');

          if (recError) {
            throw new Error(`Failed to fetch recipients: ${recError.message}`);
          }

          // Fetch broadcast message
          const { data: broadcast, error: brError } = await supabase
            .from('broadcasts')
            .select('message')
            .eq('id', broadcast_id)
            .single();

          if (brError || !broadcast) {
            throw new Error(`Failed to fetch broadcast details: ${brError?.message || 'Not found'}`);
          }

          // Update broadcast status to 'running'
          await supabase
            .from('broadcasts')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', broadcast_id);

          // Queue a send_dm job for each recipient
          if (recipients && recipients.length > 0) {
            const sendJobs = recipients.map(r => ({
              type: 'send_dm',
              payload: { recipient_id: r.igsid, broadcast_recipient_id: r.id, broadcast_id },
              status: 'pending',
              next_run_at: new Date().toISOString()
            }));

            const { error: batchError } = await supabase
              .from('jobs')
              .insert(sendJobs);

            if (batchError) {
              throw new Error(`Failed to queue broadcast DM jobs: ${batchError.message}`);
            }
          }

          jobSuccess = true;
        } else {
          throw new Error(`Unknown job type: ${job.type}`);
        }
      } catch (err: any) {
        jobErrorMsg = err?.message || 'Error executing job';
      }

      if (jobSuccess) {
        // 3. Mark job as done
        await supabase
          .from('jobs')
          .update({
            status: 'done',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // If this job was linked to a broadcast recipient, mark them as sent
        if (job.payload.broadcast_recipient_id) {
          await supabase
            .from('broadcast_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', job.payload.broadcast_recipient_id);

          // Increment sent count in broadcasts
          if (job.payload.broadcast_id) {
            const { data: currentBroadcast } = await supabase
              .from('broadcasts')
              .select('sent_count')
              .eq('id', job.payload.broadcast_id)
              .single();

            const sentCount = (currentBroadcast?.sent_count || 0) + 1;
            await supabase
              .from('broadcasts')
              .update({ sent_count: sentCount })
              .eq('id', job.payload.broadcast_id);
          }
        }

        // Log successful analytics event
        if (job.type === 'send_dm' || job.type === 'send_comment_reply') {
          await supabase
            .from('analytics_events')
            .insert({
              event_type: 'dm_sent',
              igsid: job.payload.recipient_id || null,
              metadata: { job_id: job.id, type: job.type }
            });
        }

        results.push({ job_id: job.id, status: 'done' });
      } else {
        // 4. Job failed: handle retry or fail completely
        const nextAttempts = job.attempts + 1;
        const isDead = nextAttempts >= job.max_attempts;

        if (isDead) {
          // Move to failed jobs
          await supabase
            .from('failed_jobs')
            .insert({
              job_id: job.id,
              type: job.type,
              payload: job.payload,
              error: jobErrorMsg,
              attempts: nextAttempts
            });

          // Delete or mark status as failed
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              attempts: nextAttempts,
              error: jobErrorMsg,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          // Update broadcast recipient status if linked
          if (job.payload.broadcast_recipient_id) {
            await supabase
              .from('broadcast_recipients')
              .update({
                status: 'failed',
                error: jobErrorMsg
              })
              .eq('id', job.payload.broadcast_recipient_id);

            if (job.payload.broadcast_id) {
              const { data: currentBroadcast } = await supabase
                .from('broadcasts')
                .select('failed_count')
                .eq('id', job.payload.broadcast_id)
                .single();

              const failedCount = (currentBroadcast?.failed_count || 0) + 1;
              await supabase
                .from('broadcasts')
                .update({ failed_count: failedCount })
                .eq('id', job.payload.broadcast_id);
            }
          }

          // Log failure event
          if (job.type === 'send_dm' || job.type === 'send_comment_reply') {
            await supabase
              .from('analytics_events')
              .insert({
                event_type: 'dm_failed',
                igsid: job.payload.recipient_id || null,
                metadata: { job_id: job.id, error: jobErrorMsg }
              });
          }
        } else {
          // Exponential backoff retry: attempts^2 * 60 seconds
          const delaySeconds = Math.pow(nextAttempts, 2) * 60;
          const nextRunAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

          await supabase
            .from('jobs')
            .update({
              status: 'pending',
              attempts: nextAttempts,
              next_run_at: nextRunAt,
              error: jobErrorMsg,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
        }

        results.push({ job_id: job.id, status: isDead ? 'failed' : 'retry', error: jobErrorMsg });
      }
    }

    // After processing, check if any broadcasts are now completed
    const { data: activeBroadcasts } = await supabase
      .from('broadcasts')
      .select('id')
      .eq('status', 'running');

    if (activeBroadcasts) {
      for (const b of activeBroadcasts) {
        // Count remaining pending recipients
        const { count, error: countErr } = await supabase
          .from('broadcast_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('broadcast_id', b.id)
          .eq('status', 'pending');

        if (!countErr && count === 0) {
          // Broadcast is complete
          await supabase
            .from('broadcasts')
            .update({ status: 'done', updated_at: new Date().toISOString() })
            .eq('id', b.id);
        }
      }
    }

    return NextResponse.json({ processed: pendingJobs.length, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
