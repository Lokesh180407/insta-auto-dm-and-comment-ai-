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
  const secret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET;
  if (!secret) {
    console.warn("[Webhook Verification] No FACEBOOK_APP_SECRET or INSTAGRAM_APP_SECRET configured. Skipping verification.");
    return true; // Assume true if not configured to allow developer sandbox testing
  }
  if (!sig) {
    console.error("[Webhook Verification] Signature header is missing.");
    return false;
  }
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    
  console.log("Expected:", expected);
  console.log("Received:", sig);
  try {
    const isMatched = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    console.log(`[Webhook Verification] Signature matching result: ${isMatched}`);
    return isMatched;
  } catch (err) {
    console.error("[Webhook Verification] Signature verification exception:", err);
    return false;
  }
}

// ─── GET – webhook verification ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  console.log("[Webhook Verification GET] Received validation request:", { mode, token, challenge });

  const expectedToken = process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    token === expectedToken
  ) {
    console.log("[Webhook Verification GET] Token verification successful.");
    return new Response(challenge, { status: 200 });
  }
  console.error("[Webhook Verification GET] Token verification failed. Expected:", expectedToken, "Received:", token);
  return new Response("Forbidden", { status: 403 });
}

// ─── POST – incoming events ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  console.log("[Webhook POST] Raw Payload Received:", rawBody);
  console.log("[Webhook POST] Signature Header:", signature);

  const secret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET;
  
  console.log("[Webhook POST] Secret configured:", !!secret);
  console.log("[Webhook POST] Signature received:", signature);

  const verificationResult = secret ? verifySignature(rawBody, signature) : true;
  console.log("[Webhook POST] Signature Valid:", verificationResult);

  // TEMPORARY BYPASS
  // if (secret && !verificationResult) {
  //   console.error("[Webhook POST] Signature mismatch.");
  //   return Response.json({ error: "Invalid signature" }, { status: 401 });
  // }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Webhook POST] Failed to parse JSON body:", err);
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Record this webhook event for diagnostic page if possible
  try {
    await supabase.from("dm_logs").insert({
      automationId: "00000000-0000-0000-0000-000000000000", // dummy/diagnostic entry
      commenterId: "system_webhook",
      commenterName: "system",
      commentText: `Payload received object: ${body.object}`,
      commentId: `webhook_${Date.now()}`,
      status: "DIAGNOSTIC",
      errorMessage: rawBody.substring(0, 1000)
    }).select();
  } catch (dbErr) {
    // Ignore key errors for dummy logger
  }

  if (body.object !== "instagram") {
    console.log(`[Webhook POST] Ignored webhook object type: ${body.object}`);
    return Response.json({ status: "ignored" });
  }

  const entry = (body.entry as Record<string, unknown>[])?.[0];
  if (!entry) {
    console.warn("[Webhook POST] Empty entry array.");
    return Response.json({ status: "no_entry" });
  }

  // ── Comment events (Comment-to-DM campaigns) ───────────────────────────
  const changes = entry.changes as
    | { field: string; value: Record<string, unknown> }[]
    | undefined;

  if (changes?.length) {
    console.log(`[Webhook POST] Processing ${changes.length} change(s)...`);
    for (const change of changes) {
      if (change.field !== "comments") {
        console.log(`[Webhook POST] Ignoring change field: ${change.field}`);
        continue;
      }
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

      console.log("[Webhook POST] Parsed comment details:", { instagramAccountId, commentId, mediaId, commenterId, commenterName, commentText });

      if (!commentId || !mediaId || !commenterId) {
        console.error("[Webhook POST] Comment details missing required parameters.");
        continue;
      }

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

  if (!messaging) {
    console.warn("[Webhook POST] No messaging or changes found in entry.");
    return Response.json({ status: "no_messaging" });
  }

  console.log("[Webhook POST] Parsing DM messaging details:", messaging);

  if ((messaging.message as Record<string, unknown> | undefined)?.is_echo) {
    console.log("[Webhook POST] Echo message received. Ignoring.");
    return Response.json({ status: "echo_ignored" });
  }
  if (!(messaging.message as Record<string, unknown> | undefined)?.text) {
    console.log("[Webhook POST] Non-text message received. Ignoring.");
    return Response.json({ status: "non_text" });
  }

  const igsid = (messaging.sender as Record<string, string>).id;
  const text = (messaging.message as Record<string, string>).text;
  const instagramMsgId = (messaging.message as Record<string, string>).mid;

  console.log("[Webhook POST] DM Details:", { igsid, text, instagramMsgId });

  try {
    await handleDMEvent({ igsid, text, instagramMsgId });
    return Response.json({ status: "replied" });
  } catch (err) {
    console.error("[Webhook POST] Error handling DM event:", err);
    return Response.json({ status: "error", message: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
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
  console.log(`[DM Handler] Looking up conversation for IGSID: ${igsid}`);
  
  // Find or create conversation
  let { data: conversation, error: convoFetchErr } = await supabase
    .from("instagram_conversations")
    .select("*")
    .eq("igsid", igsid)
    .maybeSingle();

  if (convoFetchErr) {
    console.error("[DM Handler] Error querying conversation table:", convoFetchErr);
  }

  if (!conversation) {
    console.log(`[DM Handler] Conversation not found. Fetching Instagram profile for user: ${igsid}`);
    const profile = await fetchInstagramProfile(igsid);
    console.log("[DM Handler] Fetched follower profile:", profile);

    const { data: newConvo, error: insertConvoErr } = await supabase
      .from("instagram_conversations")
      .insert({ igsid, ...profile })
      .select()
      .single();

    if (insertConvoErr) {
      console.error("[DM Handler] Error creating new conversation record in Supabase:", insertConvoErr);
      throw new Error(`Supabase insert fail: ${insertConvoErr.message}`);
    }
    conversation = newConvo;
  } else {
    console.log(`[DM Handler] Active conversation ID: ${conversation.id}. Refreshing profile data.`);
    const profile = await fetchInstagramProfile(igsid);
    const { error: updateConvoErr } = await supabase
      .from("instagram_conversations")
      .update(profile)
      .eq("id", conversation.id);

    if (updateConvoErr) {
      console.error("[DM Handler] Error updating conversation details:", updateConvoErr);
    }
    conversation = { ...conversation, ...profile };
  }

  if (!conversation) {
    throw new Error("Failed to initialize conversation session in Database.");
  }

  console.log(`[DM Handler] Inserting incoming message from User into database.`);
  // Store incoming message (ignore duplicates via unique constraint)
  const { error: insertErr } = await supabase
    .from("instagram_messages")
    .insert({
      conversation_id: conversation.id,
      role: "user",
      content: text,
      instagram_msg_id: instagramMsgId,
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      console.warn(`[DM Handler] Duplicate message ID: ${instagramMsgId} detected. Ignoring insert.`);
      return;
    }
    console.error("[DM Handler] Database error inserting user message:", insertErr);
  }

  await supabase
    .from("instagram_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (conversation.mode === "human") {
    console.log(`[DM Handler] Conversation is in 'human' mode. Skipping automated AI replies.`);
    return;
  }

  console.log(`[DM Handler] Conversation in 'agent' mode. Fetching message history for context.`);
  // Fetch history and get AI reply
  const { data: history, error: historyErr } = await supabase
    .from("instagram_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(20);

  if (historyErr) {
    console.error("[DM Handler] Error fetching message history:", historyErr);
  }

  console.log("[DM Handler] Requesting response from AI engine.");
  const aiResponse = await getAIResponse(
    (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  );
  console.log(`[DM Handler] AI engine responded: "${aiResponse}"`);

  console.log("[DM Handler] Dispatching message payload to Instagram Business API.");
  const sendResult = await sendInstagramMessage(igsid, aiResponse);
  console.log("[DM Handler] Instagram Send API result:", sendResult);

  console.log("[DM Handler] Recording AI response message into database.");
  const { error: insertAiErr } = await supabase.from("instagram_messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: aiResponse,
  });

  if (insertAiErr) {
    console.error("[DM Handler] Error saving AI message response in DB:", insertAiErr);
  }

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
  console.log(`[Comment Handler] Fetching active automations for media postId: ${mediaId}`);
  
  // Find active automations for this post
  const { data: automations, error: automationsErr } = await supabase
    .from("automations")
    .select(`*, tracked_links(*)`)
    .eq("postId", mediaId)
    .eq("isActive", true);

  if (automationsErr) {
    console.error("[Comment Handler] Database error querying automations:", automationsErr);
    return;
  }

  if (!automations?.length) {
    console.log(`[Comment Handler] No active automations match postId: ${mediaId}`);
    return;
  }

  console.log(`[Comment Handler] Found ${automations.length} active automation(s). Matching keywords...`);

  for (const automation of automations) {
    const isAnyComment = automation.keywords.includes("ANY_COMMENT") || automation.keywords.includes("*");
    
    let matchResult: { matched: boolean; matchedKeyword: string | null } = { matched: false, matchedKeyword: null };
    
    if (isAnyComment) {
      matchResult = { matched: true, matchedKeyword: "ANY_COMMENT" };
      console.log(`[Comment Handler] Automation uses ANY_COMMENT bypass. Allowing match.`);
    } else {
      matchResult = matchKeywords(
        commentText,
        automation.keywords,
        automation.wholeWordMatch
      );
      console.log(`[Comment Handler] Keyword matching details:`, {
        commentText,
        keywords: automation.keywords,
        matchResult
      });
    }

    if (!matchResult.matched) continue;

    console.log(`[Comment Handler] Keyword matched! Checking for duplicates on commenter: ${commenterId}`);
    // Check for duplicate
    const { data: existing, error: existingErr } = await supabase
      .from("dm_logs")
      .select("id, status")
      .eq("automationId", automation.id)
      .eq("commentId", commentId)
      .maybeSingle();

    if (existingErr) {
      console.error("[Comment Handler] Error querying dm_logs:", existingErr);
    }

    if (
      existing?.status === "SENT" ||
      existing?.status === "SKIPPED_PLAN_LIMIT"
    ) {
      console.log(`[Comment Handler] Automation already triggered for comment: ${commentId} (status: ${existing.status}). Skipping.`);
      continue;
    }

    // Render message with tracked link substitution
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
    const dmMessage = renderMessageWithTracking({
      message: automation.dmMessage,
      commenterName,
      trackedLinks: automation.tracked_links ?? [],
    });

    console.log(`[Comment Handler] DM message rendered: "${dmMessage}"`);
    console.log(`[Comment Handler] Saving PENDING DM log in database.`);

    // Upsert log as PENDING
    const { error: upsertErr } = await supabase.from("dm_logs").upsert(
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

    if (upsertErr) {
      console.error("[Comment Handler] Error saving DM log state:", upsertErr);
    }

    try {
      console.log(`[Comment Handler] Dispatching private message reply via Meta Graph API...`);
      const apiResult = await sendPrivateReply(
        accessToken,
        instagramAccountId,
        commentId,
        dmMessage
      );
      console.log(`[Comment Handler] Meta Graph API result:`, apiResult);

      const { error: updateSuccessErr } = await supabase
        .from("dm_logs")
        .update({
          status: "SENT",
          dmSentAt: new Date().toISOString(),
          errorMessage: null,
        })
        .eq("automationId", automation.id)
        .eq("commentId", commentId);

      if (updateSuccessErr) {
        console.error("[Comment Handler] Error updating DM log status to SENT:", updateSuccessErr);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Comment Handler] Failed to dispatch private message:", message);
      
      const { error: updateFailErr } = await supabase
        .from("dm_logs")
        .update({ status: "FAILED", errorMessage: message })
        .eq("automationId", automation.id)
        .eq("commentId", commentId);

      if (updateFailErr) {
        console.error("[Comment Handler] Error saving DM log failure status:", updateFailErr);
      }
    }
  }
}
