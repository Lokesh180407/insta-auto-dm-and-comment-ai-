// ─── Conversation / Inbox ──────────────────────────────────────────────────

export interface Conversation {
  id: string;
  igsid: string;
  name: string | null;
  username: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
  mode: "agent" | "human";
  updated_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  instagram_msg_id: string | null;
  created_at: string;
}

export interface ConversationWithLastMessage extends Conversation {
  last_message: string | null;
}

// ─── Campaign / Comment-to-DM ──────────────────────────────────────────────

export type DmStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED_DEDUP"
  | "SKIPPED_RATE_LIMIT"
  | "SKIPPED_PLAN_LIMIT"
  | "SKIPPED_NO_MATCH";

export interface Automation {
  id: string;
  name: string;
  goal: string | null;
  postId: string;
  postUrl: string | null;
  keywords: string[];
  dmMessage: string;
  isActive: boolean;
  wholeWordMatch: boolean;
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackedLink {
  id: string;
  automationId: string;
  slug: string;
  label: string | null;
  destinationUrl: string;
  created_at: string;
}

export interface DmLog {
  id: string;
  automationId: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  commentId: string;
  matchedKeyword: string | null;
  status: DmStatus;
  attempts: number;
  dmSentAt: string | null;
  errorMessage: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkClick {
  id: string;
  automationId: string;
  trackedLinkId: string;
  ipHash: string | null;
  userAgent: string | null;
  referrer: string | null;
  created_at: string;
}

// ─── Enriched Campaign (returned by API) ──────────────────────────────────

export interface CampaignAnalytics {
  sent: number;
  skipped: number;
  failed: number;
  clicks: number;
  ctr: number;
  topKeywords: { keyword: string; count: number }[];
}

export interface AutomationWithStats extends Automation {
  trackedLinks: (TrackedLink & { trackedUrl: string; clickCount: number })[];
  analytics: CampaignAnalytics;
  reportUrl: string | null;
}
