import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";
import {
  sendInstagramMessage,
  fetchInstagramProfile,
  sendPrivateReply,
} from "@/lib/instagram";
import { getAIResponse } from "@/lib/ai";
import { matchKeywords } from "@/lib/keyword-matcher";
import { renderMessageWithTracking } from "@/lib/tracking";

// ─── Helpers ────────────────────────────────────────────────────────────────

function verifySignature(payload: string, sig: string | null): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret || !sig) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── GET – webhook verification ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.INSTAGRAM_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── POST – incoming events ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Only verify when the secret is configured
  if (process.env.FACEBOOK_APP_SECRET && !verifySignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "instagram") {
    return Response.json({ status: "ignored" });
  }

  const entry = (body.entry as Record<string, unknown>[])?.[0];
  if (!entry) return Response.json({ status: "no_entry" });

  // ── Comment events (Comment-to-DM campaigns) ───────────────────────────
  const changes = entry.changes as
    | { field: string; value: Record<string, unknown> }[]
    | undefined;

  if (changes?.length) {
    for (const change of changes) {
      if (change.field !== "comments") continue;
      const v = change.value;
      const instagramAccountId = entry.id as string;
      const commentId = (v.id ?? v.comment_id) as string | undefined;
      const mediaId = ((v.media as Record<string, string> | undefined)?.id ??
        v.media_id) as string | undefined;
      const commenterId = (v.from as Record<string, string> | undefined)
        ?.id as string | undefined;
      const commenterName = (v.from as Record<string, string> | undefined)
        ?.username as string | undefined;
      const commentText = (v.text as string) ?? "";

      if (!commentId || !mediaId || !commenterId) continue;

      await handleCommentEvent({
        instagramAccountId,
        commentId,
        commentText,
        commenterId,
        commenterName,
        mediaId,
      });
    }
    return Response.json({ status: "processed_comments" });
  }

  // ── DM / messaging events (Inbox AI Agent) ────────────────────────────
  const messaging = (
    entry.messaging as Record<string, unknown>[] | undefined
  )?.[0];

  if (!messaging) return Response.json({ status: "no_messaging" });
  if ((messaging.message as Record<string, unknown> | undefined)?.is_echo) {
    return Response.json({ status: "echo_ignored" });
  }
  if (!(messaging.message as Record<string, unknown> | undefined)?.text) {
    return Response.json({ status: "non_text" });
  }

  const igsid = (messaging.sender as Record<string, string>).id;
  const text = (messaging.message as Record<string, string>).text;
  const instagramMsgId = (messaging.message as Record<string, string>).mid;

  try {
    await handleDMEvent({ igsid, text, instagramMsgId });
    return Response.json({ status: "replied" });
  } catch (err) {
    console.error("Webhook DM error:", err);
    return Response.json({ status: "error" }, { status: 500 });
  }
}

// ─── DM event handler ────────────────────────────────────────────────────────

async function handleDMEvent({
  igsid,
  text,
  instagramMsgId,
}: {
  igsid: string;
  text: string;
  instagramMsgId: string;
}) {
  // Find or create conversation
  let { data: conversation } = await supabase
    .from("instagram_conversations")
    .select("*")
    .eq("igsid", igsid)
    .single();

  if (!conversation) {
    const profile = await fetchInstagramProfile(igsid);
    const { data: newConvo } = await supabase
      .from("instagram_conversations")
      .insert({ igsid, ...profile })
      .select()
      .single();
    conversation = newConvo;
  } else {
    const profile = await fetchInstagramProfile(igsid);
    await supabase
      .from("instagram_conversations")
      .update(profile)
      .eq("id", conversation.id);
    conversation = { ...conversation, ...profile };
  }

  if (!conversation) throw new Error("Failed to create conversation");

  // Store incoming message (ignore duplicates via unique constraint)
  const { error: insertErr } = await supabase
    .from("instagram_messages")
    .insert({
      conversation_id: conversation.id,
      role: "user",
      content: text,
      instagram_msg_id: instagramMsgId,
    });

  if (insertErr?.code === "23505") return; // duplicate

  await supabase
    .from("instagram_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (conversation.mode === "human") return;

  // Fetch history and get AI reply
  const { data: history } = await supabase
    .from("instagram_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const aiResponse = await getAIResponse(
    (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  );

  await sendInstagramMessage(igsid, aiResponse);

  await supabase.from("instagram_messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: aiResponse,
  });

  await supabase
    .from("instagram_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);
}

// ─── Comment event handler ────────────────────────────────────────────────────

async function handleCommentEvent({
  instagramAccountId,
  commentId,
  commentText,
  commenterId,
  commenterName,
  mediaId,
}: {
  instagramAccountId: string;
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
}) {
  // Find active automations for this post
  const { data: automations } = await supabase
    .from("automations")
    .select(`*, tracked_links(*)`)
    .eq("postId", mediaId)
    .eq("isActive", true);

  if (!automations?.length) return;

  for (const automation of automations) {
    const matchResult = matchKeywords(
      commentText,
      automation.keywords,
      automation.wholeWordMatch
    );
    if (!matchResult.matched) continue;

    // Check for duplicate
    const { data: existing } = await supabase
      .from("dm_logs")
      .select("id, status")
      .eq("automationId", automation.id)
      .eq("commentId", commentId)
      .single();

    if (
      existing?.status === "SENT" ||
      existing?.status === "SKIPPED_PLAN_LIMIT"
    )
      continue;

    // Render message with tracked link substitution
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
    const dmMessage = renderMessageWithTracking({
      message: automation.dmMessage,
      commenterName,
      trackedLinks: automation.tracked_links ?? [],
    });

    // Upsert log as PENDING
    await supabase.from("dm_logs").upsert(
      {
        automationId: automation.id,
        commenterId,
        commenterName: commenterName ?? null,
        commentText,
        commentId,
        matchedKeyword: matchResult.matchedKeyword,
        status: "PENDING",
        attempts: (existing?.status ? 1 : 0) + 1,
        errorMessage: null,
      },
      { onConflict: "automationId,commentId" }
    );

    try {
      await sendPrivateReply(
        accessToken,
        instagramAccountId,
        commentId,
        dmMessage
      );

      await supabase
        .from("dm_logs")
        .update({
          status: "SENT",
          dmSentAt: new Date().toISOString(),
          errorMessage: null,
        })
        .eq("automationId", automation.id)
        .eq("commentId", commentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("dm_logs")
        .update({ status: "FAILED", errorMessage: message })
        .eq("automationId", automation.id)
        .eq("commentId", commentId);
    }
  }
}
