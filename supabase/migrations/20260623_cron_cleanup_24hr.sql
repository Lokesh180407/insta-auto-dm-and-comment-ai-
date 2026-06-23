-- Auto-delete conversations (and their messages) older than 24 hours.
-- Run this in Supabase SQL Editor as a one-time setup.

-- Step 1: Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Delete messages belonging to expired conversations
-- Step 3: Delete conversations whose 24-hr window has expired
-- We run both in one job every hour.
SELECT cron.schedule(
  '24hr-conversation-cleanup',     -- job name
  '0 * * * *',                     -- every hour
  $$
    DELETE FROM instagram_messages
    WHERE conversation_id IN (
      SELECT id FROM instagram_conversations
      WHERE can_reply_until IS NOT NULL
        AND can_reply_until < NOW() - INTERVAL '24 hours'
    );

    DELETE FROM instagram_conversations
    WHERE can_reply_until IS NOT NULL
      AND can_reply_until < NOW() - INTERVAL '24 hours';
  $$
);
