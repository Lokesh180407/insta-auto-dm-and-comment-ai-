# Deployment Guide: Unified Instagram AI Chatbot & Comment-to-DM Platform

This guide outlines the steps to deploy your unified Next.js application, set up your Supabase database, and connect your Instagram/Meta webhooks for production.

---

## 1. Supabase Database Setup

### Step A: Create a New Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Create a new project and select a name, database password, and region.
3. Save your project **API URL** and **Anon/Public Key** and **Service Role Key**.

### Step B: Run the Database Schema
Go to the **SQL Editor** in your Supabase Dashboard, create a new query, paste the following SQL script, and run it:

```sql
-- 1. instagram_conversations
CREATE TABLE IF NOT EXISTS instagram_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    igsid TEXT UNIQUE NOT NULL,
    name TEXT,
    username TEXT,
    profile_pic TEXT,
    follower_count INTEGER,
    is_user_follow_business BOOLEAN,
    is_business_follow_user BOOLEAN,
    mode TEXT DEFAULT 'agent' CHECK (mode IN ('agent', 'human')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. instagram_messages
CREATE TABLE IF NOT EXISTS instagram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES instagram_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    instagram_msg_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. automations
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goal TEXT,
    "postId" TEXT NOT NULL,
    "postUrl" TEXT,
    keywords TEXT[] NOT NULL,
    "dmMessage" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true NOT NULL,
    "wholeWordMatch" BOOLEAN DEFAULT true NOT NULL,
    "reportShareSlug" TEXT UNIQUE,
    "reportShareEnabled" BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. dm_logs
CREATE TABLE IF NOT EXISTS dm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "automationId" UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
    "commenterId" TEXT NOT NULL,
    "commenterName" TEXT,
    "commentText" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "matchedKeyword" TEXT,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    "dmSentAt" TIMESTAMPTZ,
    "errorMessage" TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. tracked_links
CREATE TABLE IF NOT EXISTS tracked_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "automationId" UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    label TEXT,
    "destinationUrl" TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. link_clicks
CREATE TABLE IF NOT EXISTS link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "automationId" UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
    "trackedLinkId" UUID REFERENCES tracked_links(id) ON DELETE CASCADE NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Step C: Enable Realtime (Crucial for Realtime Inbox Chat)
Go to **Database** -> **Replication** (or SQL Editor) in your Supabase Dashboard. 
To enable real-time message and conversation updates, run the following SQL query:

```sql
alter publication supabase_realtime add table instagram_conversations;
alter publication supabase_realtime add table instagram_messages;
alter publication supabase_realtime add table automations;
alter publication supabase_realtime add table dm_logs;
```

### Step D: Database Security Warning (Row Level Security)
> [!CAUTION]
> By default, the schema initialized above does not have Row Level Security (RLS) enabled. This is ideal for testing and simple setups where any client with the `anon` key can read/write directly.
>
> If you are deploying to a **production environment with real users**, you should enable RLS on your tables and configure policies to secure your data.
>
> To enable RLS, run:
> ```sql
> ALTER TABLE public.instagram_conversations ENABLE ROW LEVEL SECURITY;
> ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;
> ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
> ALTER TABLE public.dm_logs ENABLE ROW LEVEL SECURITY;
> ALTER TABLE public.tracked_links ENABLE ROW LEVEL SECURITY;
> ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
> ```
> *Note: Once RLS is enabled, you must define appropriate SELECT, INSERT, UPDATE, and DELETE policies for authenticated users.*

---

## 2. Environment Variables Configuration

In your Vercel deployment (or local `.env.local` file), configure the following environment variables:

```ini
# ─── Supabase Configuration ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ─── Instagram / Meta Webhook API Configuration ──────────────────────────────
# Meta Page Access Token (requires instagram_basic, instagram_manage_comments, instagram_manage_messages permissions)
INSTAGRAM_ACCESS_TOKEN=your-page-access-token
# Found under App Settings -> Basic on developers.facebook.com
INSTAGRAM_APP_SECRET=your-app-secret
# Arbitrary verification token string you choose when setting up the Meta Webhook
VERIFY_TOKEN=your-chosen-verify-token

# ─── OpenRouter AI Configuration ─────────────────────────────────────────────
# OpenRouter API Key for fallback AI responses
OPENROUTER_API_KEY=your-openrouter-api-key
# (Optional) Preferred LLM model identifier. E.g. "google/gemma-3-12b-it:free"
AI_MODEL=google/gemma-3-12b-it:free

# ─── App Redirection Details ─────────────────────────────────────────────────
# The base URL of your deployed application (required for generating campaign tracked link slugs)
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
```

---

## 3. Webhook Setup on Meta Developer Portal

To listen to real-time Instagram DMs and comment events, register the webhook on Facebook Developers:

1. Go to the [Meta Developer Portal](https://developers.facebook.com).
2. Create or select a **Business App**.
3. Under **Products**, add **Webhooks**.
4. In the Webhook settings dropdown, select **Instagram**.
5. Click **Subscribe to this object**:
   - **Callback URL**: `https://your-app-domain.vercel.app/api/webhook`
   - **Verify Token**: `<your-chosen-verify-token>` (must match the `VERIFY_TOKEN` env var)
6. Click **Verify and Save**.
7. Subscribe to the following fields:
   - `messages` — triggers the Inbox AI Auto-Replier when DMs are received.
   - `comments` — triggers the Comment-to-DM campaigns when followers comment on posts.

*Note: In Meta's App Dashboard, ensure your App is set to **Live Mode** and has gone through App Review for the required permissions if you plan on serving public users.*

---

## 4. Supabase Edge Functions (Optional Serverless Backend)

We have successfully deployed the backend logic to **Supabase Edge Functions** for you! These functions handle everything from Webhooks to AI generation and link redirects entirely within Supabase.

If you prefer to use Supabase as your complete backend (instead of Vercel API routes), you must set the following secrets in your Supabase Dashboard (**Project Settings -> Edge Functions -> Secrets**):

- `INSTAGRAM_ACCESS_TOKEN`
- `FACEBOOK_APP_SECRET`
- `INSTAGRAM_VERIFY_TOKEN`
- `OPENROUTER_API_KEY`
- `APP_URL` (The URL of your deployed frontend)
- `META_GRAPH_API_VERSION` (Optional, defaults to v24.0)
- `AI_MODEL` (Optional, defaults to google/gemma-3-12b-it:free)

The deployed edge functions are:
1. `webhook`
2. `automations`
3. `logs`
4. `conversations`
5. `instagram-posts`
6. `redirect`

If using these, your Meta Webhook URL will be:
`https://your-project-id.supabase.co/functions/v1/webhook`

---

## 5. Frontend Deployment on Vercel

1. Push your code repository containing all the root files (where `package.json` is located at the root level) to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Keep the **Root Directory** as default (the root of the project `./`).
5. Expand the **Environment Variables** section and add all keys from Section 2.
6. Click **Deploy**.

*Note: By default, the Next.js frontend is configured to use its own built-in API routes. If you wish to use the Supabase Edge Functions exclusively, you can configure Next.js `rewrites` in `next.config.ts` to point `/api/:path*` to `https://nxoibpigjbwcxuuqckmb.supabase.co/functions/v1/:path*`.*
