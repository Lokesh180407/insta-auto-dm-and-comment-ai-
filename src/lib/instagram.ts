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
  return `https://graph.instagram.com/${v}`;
}

function token() {
  return process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
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

  const res = await fetch(url.toString());
  const data = await res.json();

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

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  });
  return res.json();
}

/** Send a private reply to an Instagram comment (comment-to-DM) */
export async function sendPrivateReply(
  accessToken: string,
  instagramAccountId: string,
  commentId: string,
  message: string
) {
  const res = await fetch(
    `${graphBase()}/${instagramAccountId}/messages`,
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
  return res.json();
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
  const url = new URL(`${graphBase()}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink"
  );
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  return data.data ?? [];
}
