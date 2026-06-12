-- Phase 1 CRM Foundation Schema

-- instagram_contacts
CREATE TABLE IF NOT EXISTS instagram_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igsid TEXT UNIQUE NOT NULL,
  username TEXT,
  name TEXT,
  profile_pic TEXT,
  email TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  lead_status TEXT DEFAULT 'New', -- New, Interested, Qualified, Proposal, Won, Lost
  assigned_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- conversation_notes
CREATE TABLE IF NOT EXISTS conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  user_id TEXT, -- The agent who wrote the note
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tags (skip if exists from previous phase)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- conversation_tags
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

-- custom_fields
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- text, number, date, select
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contact_custom_fields
CREATE TABLE IF NOT EXISTS contact_custom_fields (
  contact_id UUID NOT NULL REFERENCES instagram_contacts(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  PRIMARY KEY (contact_id, field_id)
);

-- update instagram_conversations
ALTER TABLE instagram_conversations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- Insert default tags
INSERT INTO tags (name, color) VALUES 
('Hot Lead', '#ef4444'),
('Cold Lead', '#3b82f6'),
('VIP', '#f59e0b'),
('Customer', '#10b981'),
('Interested', '#8b5cf6'),
('Demo', '#ec4899'),
('Spam', '#6b7280')
ON CONFLICT (name) DO NOTHING;
