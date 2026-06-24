-- Migration: Setup advanced Campaign Builder tables and columns

-- 1. Create message_templates table if not exists
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  buttons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for message_templates
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- 2. Add campaign_config column to automations table
ALTER TABLE automations ADD COLUMN IF NOT EXISTS campaign_config JSONB DEFAULT '{}'::jsonb;

-- 3. Add campaign_metadata column to instagram_conversations table
ALTER TABLE instagram_conversations ADD COLUMN IF NOT EXISTS campaign_metadata JSONB DEFAULT '{}'::jsonb;
