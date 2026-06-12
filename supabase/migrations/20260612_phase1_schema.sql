-- ─── Phase 1 Schema Enhancement ──────────────────────────────────────────────
-- Production-grade Instagram Automation Platform
-- Adds: labels, notes, contacts (CRM), jobs/retry, webhook_logs, analytics_events
-- Enhances: instagram_conversations, automations

-- ─── Labels ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Conversation Labels (many-to-many) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_labels (
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);

-- ─── Notes (per conversation) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_by      TEXT DEFAULT 'owner',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Contacts (CRM layer) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igsid                 TEXT UNIQUE NOT NULL,
  username              TEXT,
  name                  TEXT,
  profile_pic           TEXT,
  follower_count        INT,
  email                 TEXT,
  phone                 TEXT,
  lead_score            INT DEFAULT 0,
  tags                  TEXT[] DEFAULT '{}',
  custom_fields         JSONB DEFAULT '{}',
  is_user_follow_business BOOLEAN,
  is_business_follow_user BOOLEAN,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Webhook logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,
  payload       JSONB,
  processed     BOOLEAN DEFAULT FALSE,
  error         TEXT,
  latency_ms    INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Jobs / Retry Queue ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL, -- 'send_dm' | 'send_comment_reply' | 'broadcast' | 'ai_reply'
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | running | done | failed
  attempts      INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 3,
  next_run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Failed Jobs (dead-letter queue) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failed_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID,
  type        TEXT,
  payload     JSONB,
  error       TEXT,
  attempts    INT,
  failed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Analytics Events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL, -- 'dm_sent' | 'dm_failed' | 'comment_triggered' | 'ai_reply' | 'human_reply' | 'link_click'
  conversation_id UUID REFERENCES instagram_conversations(id) ON DELETE SET NULL,
  campaign_id     UUID,
  igsid           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Broadcasts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | running | done | failed
  audience_filter JSONB DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ,
  sent_count      INT DEFAULT 0,
  failed_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Broadcasts Recipients ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  igsid        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  error        TEXT,
  sent_at      TIMESTAMPTZ
);

-- ─── Knowledge Documents ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text', -- text | pdf | url | faq
  content     TEXT,
  url         TEXT,
  chunk_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Embeddings (vector store) ───────────────────────────────────────────────
-- Requires pgvector extension. Enable via: CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_text  TEXT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── Enhance instagram_conversations ─────────────────────────────────────────
ALTER TABLE instagram_conversations
  ADD COLUMN IF NOT EXISTS unread_count    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_to     TEXT,
  ADD COLUMN IF NOT EXISTS ai_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed          BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── App Settings (enhanced) ─────────────────────────────────────────────────
-- Already exists, just ensure ai_system_prompt and ai_model columns exist
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS ai_model         TEXT DEFAULT 'google/gemma-3-12b-it:free',
  ADD COLUMN IF NOT EXISTS ai_personality   TEXT DEFAULT 'helpful and friendly',
  ADD COLUMN IF NOT EXISTS working_hours    JSONB DEFAULT '{"enabled": false}',
  ADD COLUMN IF NOT EXISTS team_name        TEXT DEFAULT 'Support Team';

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_igsid ON contacts(igsid);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id, status);
