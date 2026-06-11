export interface InstagramProfile {
  name: string | null;
  username: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  is_user_follow_business: boolean | null;
  is_business_follow_user: boolean | null;
}

function graphBase() {
  const v = process.env.META_GRAPH_API_VERSION ?? "v24.0";
  return `https://graph.facebook.com/${v}`;
}

function token() {
  return process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
}

/** Get the Instagram Business Account ID linked to this Page Token */
export async function getInstagramBusinessAccountId(accessToken: string): Promise<string> {
  const v = process.env.META_GRAPH_API_VERSION ?? "v24.0";
  const url = `https://graph.facebook.com/${v}/me?fields=instagram_business_account&access_token=${accessToken}`;
  console.log("[Instagram API] Fetching business account ID from /me");
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    console.error("[Instagram API] Error fetching business ID:", data.error);
    throw new Error(data.error.message || "Failed to fetch Instagram Business Account ID");
  }
  const id = data.instagram_business_account?.id;
  if (!id) {
    throw new Error("No Instagram Business Account linked to this Facebook Page Access Token.");
  }
  return id;
}

/** Fetch business account details */
export async function fetchInstagramBusinessProfile(accessToken: string, businessAccountId: string) {
  const v = process.env.META_GRAPH_API_VERSION ?? "v24.0";
  const url = `https://graph.facebook.com/${v}/${businessAccountId}?fields=name,username,profile_picture_url&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    console.error("[Instagram API] Error fetching business profile:", data.error);
    throw new Error(data.error.message);
  }
  return data;
}

export async function fetchInstagramProfile(
  igsid: string
): Promise<InstagramProfile> {
  const url = new URL(`${graphBase()}/${igsid}`);
  url.searchParams.set(
    "fields",
    "name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user"
  );
  url.searchParams.set("access_token", token());

  console.log(`[Instagram API] Fetching profile for IGSID: ${igsid}`);
  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    console.error(`[Instagram API] Error fetching profile for ${igsid}:`, data.error);
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

export async function sendInstagramMessage(
  recipientIgsid: string,
  text: string
) {
  const url = new URL(`${graphBase()}/me/messages`);
  url.searchParams.set("access_token", token());

  console.log(`[Instagram API] Sending message to ${recipientIgsid}`);
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
    console.error("[Instagram API] Send message error:", data.error);
  }
  return data;
}

/** Send a private reply to an Instagram comment (comment-to-DM) */
export async function sendPrivateReply(
  accessToken: string,
  instagramAccountId: string,
  commentId: string,
  message: string
) {
  // Use graphBase() to query the endpoint
  const url = `${graphBase()}/${instagramAccountId}/messages`;
  console.log(`[Instagram API] Sending private reply to comment: ${commentId}`);
  const res = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text: message },
      }),
    }
  );
  const data = await res.json();
  if (data.error) {
    console.error("[Instagram API] Private reply error:", data.error);
    throw new Error(data.error.message);
  }
  return data;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink?: string;
}

export async function getUserMedia(
  accessToken: string,
  limit = 25
): Promise<InstagramMedia[]> {
  try {
    const businessId = await getInstagramBusinessAccountId(accessToken);
    const v = process.env.META_GRAPH_API_VERSION ?? "v24.0";
    const url = new URL(`https://graph.facebook.com/${v}/${businessId}/media`);
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
    );
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("access_token", accessToken);

    console.log(`[Instagram API] Fetching media from business account: ${businessId}`);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) {
      console.error("[Instagram API] Error fetching media:", data.error);
      throw new Error(data.error.message);
    }
    return data.data ?? [];
  } catch (error) {
    console.error("[Instagram API] Exception in getUserMedia:", error);
    throw error;
  }
}
