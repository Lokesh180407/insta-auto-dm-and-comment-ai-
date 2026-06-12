-- Migration: 24-Hour Window tracking for conversations

ALTER TABLE instagram_conversations
  ADD COLUMN IF NOT EXISTS can_reply_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index for fast queries on the reply window
CREATE INDEX IF NOT EXISTS idx_conversations_reply_window ON instagram_conversations(can_reply_until);
