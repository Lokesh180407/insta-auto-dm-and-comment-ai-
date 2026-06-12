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
  caption: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;
  media_url: string;
  thumbnail: string | null;
  timestamp: string;
  permalink: string;
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
let _cachedPageId: string | null = null;

export async function resolveInstagramAndPageIds(accessToken: string): Promise<{ pageId: string; igBizId: string; userId: string }> {
  if (_cachedPageId && _cachedBizId) {
    return { pageId: _cachedPageId, igBizId: _cachedBizId, userId: "Cached" };
  }

  const v = process.env.META_GRAPH_API_VERSION ?? "v24.0";
  let facebookUserId = "N/A (Token is Page-scoped)";

  // Attempt 1: See if /me is the Page itself (Page Access Token)
  const r1 = await fetch(`https://graph.facebook.com/${v}/me?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`);
  const d1 = await r1.json();

  if (d1.id && d1.instagram_business_account?.id) {
    _cachedPageId = d1.id;
    _cachedBizId = d1.instagram_business_account.id;
    return { pageId: _cachedPageId!, igBizId: _cachedBizId!, userId: facebookUserId };
  }

  // If we reach here, /me returned something without an instagram_business_account.
  // This means the token is likely a User Access Token. We save the User ID for logging.
  if (d1.id) {
    facebookUserId = d1.id;
  }

  // Attempt 2: List the Pages this User manages to find the connected Page
  const r2 = await fetch(`https://graph.facebook.com/${v}/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`);
  const d2 = await r2.json();

  if (d2.data && d2.data.length > 0) {
    for (const page of d2.data) {
      if (page.instagram_business_account?.id) {
        _cachedPageId = page.id;
        _cachedBizId = page.instagram_business_account.id;
        return { pageId: _cachedPageId!, igBizId: _cachedBizId!, userId: facebookUserId };
      }
    }
  }

  throw new Error(
    "Could not resolve Facebook Page ID. Ensure the token has 'pages_show_list' and 'instagram_basic' permissions."
  );
}

export async function getFacebookPageId(accessToken: string): Promise<string> {
  const ids = await resolveInstagramAndPageIds(accessToken);
  return ids.pageId;
}

export async function getInstagramBusinessAccountId(accessToken: string): Promise<string> {
  const ids = await resolveInstagramAndPageIds(accessToken);
  return ids.igBizId;
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
  const ids = await resolveInstagramAndPageIds(tok);

  // Meta Documentation: https://developers.facebook.com/docs/messenger-platform/reference/send-api
  // Explicitly use /{page-id}/messages to avoid "Object with ID 'me' does not exist" errors
  // which can happen with certain System User Page Tokens.
  const url = new URL(`${graphBase()}/${ids.pageId}/messages`);
  url.searchParams.set("access_token", tok);

  const payload = {
    recipient: { id: recipientIgsid },
    message: { text },
    messaging_type: "RESPONSE", // Required/Recommended by Meta for standard 24h window replies
  };

  const endpointStr = url.toString().split("?")[0] + "?access_token=...";

  console.log({
    message: "Initiating Send Message",
    facebookUserId: ids.userId,
    facebookPageId: ids.pageId,
    instagramAccountId: ids.igBizId,
    endpoint: endpointStr,
    payload,
  });

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  const data = await res.json();
  
  console.log({
    status: res.status,
    response: data,
  });
  
  if (!res.ok || data.error) {
    console.error("[Instagram] sendInstagramMessage failed:");
    console.error(" - URL:", `${graphBase()}/me/messages`);
    console.error(" - Payload:", JSON.stringify(payload));
    console.error(" - HTTP Status:", res.status);
    console.error(" - Graph API Error:", data.error || data);
    throw new Error(data.error?.message || "Unknown Meta API Error");
  }
  return data;
}

// ─── Send Private Reply to a comment (Comment → DM) ─────────────────────────
export async function sendPrivateReply(
  accessToken: string,
  _instagramAccountId: string,
  commentId: string,
  message: string
) {
  const ids = await resolveInstagramAndPageIds(accessToken);

  // Explicitly use /{page-id}/messages to avoid "Object with ID 'me' does not exist"
  const url = `${graphBase()}/${ids.pageId}/messages`;
  
  const payload = {
    recipient: { comment_id: commentId },
    message: { text: message },
  };

  const endpointStr = url + "?access_token=...";

  console.log({
    message: "Initiating Private Reply",
    facebookUserId: ids.userId,
    facebookPageId: ids.pageId,
    instagramAccountId: ids.igBizId,
    endpoint: endpointStr,
    payload,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  
  const data = await res.json();
  
  console.log({
    status: res.status,
    response: data,
  });
  
  if (!res.ok || data.error) {
    console.error("[Instagram] sendPrivateReply failed:");
    console.error(" - URL:", url);
    console.error(" - Payload:", JSON.stringify(payload));
    console.error(" - HTTP Status:", res.status);
    console.error(" - Graph API Error:", data.error || data);
    throw new Error(data.error?.message || "Unknown Meta API Error");
  }
  return data;
}

export function normalizeMedia(post: Record<string, unknown>): InstagramMedia {
  return {
    id: post.id as string,
    caption: (post.caption as string) ?? "",
    media_type: (post.media_type as string) ?? "IMAGE",
    media_url: (post.media_url as string) ?? "",
    thumbnail: (post.thumbnail_url as string) ?? (post.media_url as string) ?? null,
    timestamp: (post.timestamp as string) ?? "",
    permalink: (post.permalink as string) ?? "",
  };
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

  const items: InstagramMedia[] = (data.data ?? []).map(normalizeMedia);

  return items;
}
