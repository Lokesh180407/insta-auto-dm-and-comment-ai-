// ─── Instagram / Meta Graph API library ──────────────────────────────────────
// Uses the Facebook Graph API with a Page-linked Long-Lived Access Token.
// The token must have: instagram_basic, instagram_manage_messages,
//   instagram_manage_comments, pages_show_list, pages_read_engagement

export interface InstagramProfile {
  name: string | null;
  username: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
}

export interface InstagramAccountInfo {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string;
  followers_count: number;
  biography?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink?: string;
}

function graphBase() {
  const v = process.env.META_GRAPH_API_VERSION ?? "v21.0";
  return `https://graph.facebook.com/${v}`;
}

function pageToken() {
  return (process.env.INSTAGRAM_ACCESS_TOKEN ?? "").trim();
}

// ─── Resolve IG Business Account ID ─────────────────────────────────────────
// Strategy 1: Use INSTAGRAM_BUSINESS_ACCOUNT_ID env var directly (fastest)
// Strategy 2: Call /me on the Page token -> instagram_business_account
// Strategy 3: List all pages -> find IG account
let _cachedBizId: string | null = null;

export async function getInstagramBusinessAccountId(accessToken: string): Promise<string> {
  if (_cachedBizId) return _cachedBizId;

  // Try env var first
  const envId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (envId) {
    _cachedBizId = envId;
    return envId;
  }

  const v = process.env.META_GRAPH_API_VERSION ?? "v21.0";

  // Strategy 1: /me?fields=instagram_business_account (works if token is a Page token)
  try {
    const r1 = await fetch(
      `https://graph.facebook.com/${v}/me?fields=instagram_business_account,id,name&access_token=${encodeURIComponent(accessToken)}`
    );
    const d1 = await r1.json();
    if (d1.instagram_business_account?.id) {
      _cachedBizId = d1.instagram_business_account.id;
      return _cachedBizId!;
    }
  } catch {}

  // Strategy 2: /me/accounts -> for each page -> get instagram_business_account
  try {
    const r2 = await fetch(
      `https://graph.facebook.com/${v}/me/accounts?fields=instagram_business_account,id,name&access_token=${encodeURIComponent(accessToken)}`
    );
    const d2 = await r2.json();
    if (d2.data && d2.data.length > 0) {
      for (const page of d2.data) {
        if (page.instagram_business_account?.id) {
          _cachedBizId = page.instagram_business_account.id;
          return _cachedBizId!;
        }
      }
    }
  } catch {}

  throw new Error(
    "Could not resolve Instagram Business Account ID. " +
    "Make sure your Page token has instagram_basic + pages_show_list scopes, " +
    "or set INSTAGRAM_BUSINESS_ACCOUNT_ID in your environment variables."
  );
}

// ─── Get connected Instagram account info (for header/sidebar display) ────────
export async function getAccountInfo(accessToken: string): Promise<InstagramAccountInfo> {
  const bizId = await getInstagramBusinessAccountId(accessToken);
  const v = process.env.META_GRAPH_API_VERSION ?? "v21.0";
  const fields = "id,name,username,profile_picture_url,followers_count,biography";
  const res = await fetch(
    `https://graph.facebook.com/${v}/${bizId}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message ?? "Failed to get Instagram account info");
  }
  return {
    id: data.id,
    name: data.name ?? "",
    username: data.username ?? "",
    profile_picture_url: data.profile_picture_url ?? "",
    followers_count: data.followers_count ?? 0,
    biography: data.biography,
  };
}

// ─── Fetch sender profile (for DM conversations) ─────────────────────────────
export async function fetchInstagramProfile(igsid: string): Promise<InstagramProfile> {
  const tok = pageToken();
  const url = new URL(`${graphBase()}/${igsid}`);
  url.searchParams.set(
    "fields",
    "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user"
  );
  url.searchParams.set("access_token", tok);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    console.error(`[Instagram] Profile fetch error for ${igsid}:`, data.error);
  }

  return {
    name: data.name ?? null,
    username: data.username ?? null,
    profile_pic: data.profile_pic ?? null,
    follower_count: data.follower_count ?? null,
    is_user_follow_business: data.is_user_follow_business ?? null,
    is_business_follow_user: data.is_business_follow_user ?? null,
  };
}

// ─── Send DM to a user ───────────────────────────────────────────────────────
export async function sendInstagramMessage(recipientIgsid: string, text: string) {
  const tok = pageToken();
  const url = new URL(`${graphBase()}/me/messages`);
  url.searchParams.set("access_token", tok);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  });
  const data = await res.json();
  if (data.error) {
    console.error("[Instagram] sendInstagramMessage error:", data.error);
    throw new Error(data.error.message);
  }
  return data;
}

// ─── Send Private Reply to a comment (Comment → DM) ─────────────────────────
export async function sendPrivateReply(
  accessToken: string,
  instagramAccountId: string,
  commentId: string,
  message: string
) {
  const url = `${graphBase()}/${instagramAccountId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: message },
    }),
  });
  const data = await res.json();
  if (data.error) {
    console.error("[Instagram] sendPrivateReply error:", data.error);
    throw new Error(data.error.message);
  }
  return data;
}

// ─── Get media/posts/reels ───────────────────────────────────────────────────
export async function getUserMedia(
  accessToken: string,
  limit = 30
): Promise<InstagramMedia[]> {
  const bizId = await getInstagramBusinessAccountId(accessToken);
  const v = process.env.META_GRAPH_API_VERSION ?? "v21.0";

  const url = new URL(`https://graph.facebook.com/${v}/${bizId}/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    console.error("[Instagram] getUserMedia error:", data.error);
    throw new Error(data.error.message);
  }

  const items: InstagramMedia[] = (data.data ?? []).map((post: Record<string, unknown>) => ({
    id: post.id as string,
    caption: (post.caption as string) ?? "",
    media_type: (post.media_type as string) ?? "IMAGE",
    // For VIDEO posts thumbnail_url is the cover; for IMAGE use media_url
    media_url: (post.media_url as string) ?? "",
    thumbnail_url: (post.thumbnail_url as string) ?? (post.media_url as string) ?? "",
    timestamp: (post.timestamp as string) ?? "",
    permalink: (post.permalink as string) ?? "",
  }));

  return items;
}
