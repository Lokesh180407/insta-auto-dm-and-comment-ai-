import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";
import { sendPrivateReply } from "@/lib/instagram";
import { matchKeywords } from "@/lib/keyword-matcher";
import { renderMessageWithTracking } from "@/lib/tracking";

// ─── Helpers ────────────────────────────────────────────────────────────────

function verifySignature(payload: string, sig: string | null): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET;
  if (!secret) {
    console.warn("[Webhook] No app secret configured. Skipping signature verification.");
    return true;
  }
  if (!sig) return false;

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

  const expectedToken = process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[Webhook GET] Verified OK");
    return new Response(challenge, { status: 200 });
  }
  console.error("[Webhook GET] Verification failed. Expected:", expectedToken, "Got:", token);
  return new Response("Forbidden", { status: 403 });
}

// ─── POST – incoming events ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const secret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET;
  const verified = secret ? verifySignature(rawBody, signature) : true;

  if (!verified) {
    console.error("[Webhook POST] Invalid signature.");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log webhook event
  try {
    await supabase.from("webhook_logs").insert({
      event_type: "instagram_webhook",
      payload: body,
      processed: false,
    });
  } catch { /* non-fatal */ }

  if (body.object !== "instagram") {
    return Response.json({ status: "ignored" });
  }

  const entry = (body.entry as Record<string, unknown>[])?.[0];
  if (!entry) return Response.json({ status: "no_entry" });

  // ── Comment events only ────────────────────────────────────────────────────
  const changes = entry.changes as
    | { field: string; value: Record<string, unknown> }[]
    | undefined;

  if (changes?.length) {
    for (const change of changes) {
      if (change.field !== "comments") continue;

      const v = change.value;
      const instagramAccountId = entry.id as string;
      const commentId = (v.id ?? v.comment_id) as string | undefined;
      const mediaId = ((v.media as Record<string, string> | undefined)?.id ?? v.media_id) as string | undefined;
      const commenterId = (v.from as Record<string, string> | undefined)?.id;
      const commenterName = (v.from as Record<string, string> | undefined)?.username;
      const commentText = (v.text as string) ?? "";

      console.log("[Webhook] Comment event:", { commentId, mediaId, commenterId, commentText });

      if (!commentId || !mediaId || !commenterId) {
        console.warn("[Webhook] Skipping comment — missing fields");
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

  // ── DM events: just log them, no AI inbox ─────────────────────────────────
  const messaging = (entry.messaging as Record<string, unknown>[] | undefined)?.[0];
  if (messaging) {
    const msg = messaging.message as Record<string, unknown> | undefined;
    if (msg?.is_echo) return Response.json({ status: "echo_ignored" });

    const igsid = (messaging.sender as Record<string, string>).id;
    const text = (msg?.text as string) ?? "";
    const instagramMsgId = (msg?.mid as string) ?? "";

    console.log("[Webhook] Incoming DM from:", igsid, "text:", text);

    // Find or create conversation, update 24-hr window
    const canReplyUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("instagram_conversations")
      .select("id")
      .eq("igsid", igsid)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("instagram_conversations")
        .update({ can_reply_until: canReplyUntil, is_active: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (text) {
        await supabase.from("instagram_messages").insert({
          conversation_id: existing.id,
          role: "user",
          content: text,
          instagram_msg_id: instagramMsgId || null,
        });
      }
    let convoId = existing?.id;
    if (!convoId && text) {
      const { data: nc } = await supabase
        .from("instagram_conversations")
        .insert({ igsid, can_reply_until: canReplyUntil, is_active: true })
        .select()
        .single();
      
      if (nc) {
         convoId = nc.id;
         await supabase.from("instagram_messages").insert({
          conversation_id: nc.id,
          role: "user",
          content: text,
          instagram_msg_id: instagramMsgId || null,
        });
      }
    }

    // Process DM replies for gates
    if (text && convoId) {
         const { data: cData } = await supabase.from("instagram_conversations").select("campaign_metadata").eq("id", convoId).single();
         if (cData && cData.campaign_metadata?.state === 'awaiting_email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(text.trim())) {
               // Update state
               await supabase.from("instagram_conversations").update({
                  campaign_metadata: { state: 'email_captured', email: text.trim(), automation_id: cData.campaign_metadata.automation_id }
               }).eq("id", convoId);
               
               // Queue delivery message job
               await supabase.from("jobs").insert({
                  type: "process_gate_success",
                  payload: { igsid, automation_id: cData.campaign_metadata.automation_id },
                  status: "pending",
                  attempts: 0
               });
            } else {
               // Ask again
               await supabase.from("jobs").insert({
                 type: "send_dm",
                 payload: { igsid, message: "Please provide a valid email address to continue." },
                 status: "pending",
                 attempts: 0
               });
            }
         }
      }
    }

    return Response.json({ status: "dm_logged" });
  }

  return Response.json({ status: "no_event" });
}

// ─── Comment → DM handler ─────────────────────────────────────────────────────

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
  // Find active automations
  const { data: allAutomations, error: automationsErr } = await supabase
    .from("automations")
    .select(`*, tracked_links(*)`)
    .eq("isActive", true);

  if (automationsErr) {
    console.error("[Comment Handler] DB error fetching automations:", automationsErr);
    return;
  }

  // Filter for automations targeting this specific post OR 'any' post trigger
  const automations = (allAutomations || []).filter(a => 
    a.postId === mediaId || a.campaign_config?.trigger_type === "any"
  );

  if (!automations.length) {
    console.log("[Comment Handler] No active automations for postId:", mediaId);
    return;
  }

  for (const automation of automations) {
    const isAnyComment =
      automation.keywords.includes("ANY_COMMENT") || automation.keywords.includes("*") || (automation.campaign_config?.trigger_type === "any");

    let matchResult = { matched: false, matchedKeyword: null as string | null };
    if (isAnyComment) {
      matchResult = { matched: true, matchedKeyword: "ANY_COMMENT" };
    } else {
      matchResult = matchKeywords(commentText, automation.keywords, automation.wholeWordMatch);
    }

    if (!matchResult.matched) continue;

    // Duplicate check
    const { data: existing } = await supabase
      .from("dm_logs")
      .select("id, status")
      .eq("automationId", automation.id)
      .eq("commentId", commentId)
      .maybeSingle();

    if (existing?.status === "SENT" || existing?.status === "SKIPPED_PLAN_LIMIT") {
      console.log("[Comment Handler] Already sent for comment:", commentId);
      continue;
    }

    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
    const dmMessage = renderMessageWithTracking({
      message: automation.dmMessage,
      commenterName,
      trackedLinks: automation.tracked_links ?? [],
    });
    
    const config = automation.campaign_config || {};

    // 1. Process Public Reply
    if (config.public_reply?.enabled && config.public_reply?.message) {
      // Simulate queuing a public comment reply job
      await supabase.from("jobs").insert({
        type: "send_public_reply",
        payload: { comment_id: commentId, message: config.public_reply.message },
        status: "pending",
        attempts: 0,
      });
    }

    // Log analytics
    await supabase.from("analytics_events").insert({
      event_type: "comment_triggered",
      igsid: commenterId,
      campaign_id: automation.id,
      metadata: { commentId, matchedKeyword: matchResult.matchedKeyword },
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
        attempts: existing ? 1 : 0,
        errorMessage: null,
      },
      { onConflict: "automationId,commentId" }
    );

    try {
      const apiResult = await sendPrivateReply(
        accessToken,
        instagramAccountId,
        commentId,
        dmMessage
      );
      console.log("[Comment Handler] Private reply sent:", apiResult);

      await supabase
        .from("dm_logs")
        .update({ status: "SENT", dmSentAt: new Date().toISOString(), errorMessage: null })
        .eq("automationId", automation.id)
        .eq("commentId", commentId);

      // Create/update conversation & log sent message in DB
      try {
        const canReplyUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        // Check if conversation already exists for commenterId (igsid)
        const { data: existingConvo } = await supabase
          .from("instagram_conversations")
          .select("id")
          .eq("igsid", commenterId)
          .maybeSingle();

        let convoId = existingConvo?.id;

        if (!convoId) {
          const { data: newConvo } = await supabase
            .from("instagram_conversations")
            .insert({
              igsid: commenterId,
              username: commenterName || null,
              name: commenterName || null,
              can_reply_until: canReplyUntil,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (newConvo) {
            convoId = newConvo.id;
          }
        } else {
          await supabase
            .from("instagram_conversations")
            .update({
              can_reply_until: canReplyUntil,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", convoId);

          if (automation.remove_prev_dm_data) {
            console.log(`[Webhook] remove_prev_dm_data is true. Deleting previous messages for conversation ID:`, convoId);
            await supabase
              .from("instagram_messages")
              .delete()
              .eq("conversation_id", convoId);
          }
          
          // 2. Set Gate Metadata if required
          let nextState = 'active';
          if (config.email_capture?.enabled) nextState = 'awaiting_email';
          else if (config.follow_gate?.enabled) nextState = 'awaiting_follow';
          
          if (nextState !== 'active') {
             await supabase
              .from("instagram_conversations")
              .update({
                campaign_metadata: { state: nextState, automation_id: automation.id }
              })
              .eq("id", convoId);
          } else if (config.delivery?.message) {
              // No gates, queue delivery message immediately
              await supabase.from("jobs").insert({
                type: "send_delivery_message",
                payload: { igsid: commenterId, message: config.delivery.message, button: config.delivery.button, automation_id: automation.id },
                status: "pending",
                attempts: 0,
              });
          }
        }

        if (convoId) {
          await supabase.from("instagram_messages").insert({
            conversation_id: convoId,
            role: "assistant",
            content: dmMessage,
          });
        }
      } catch (dbErr) {
        console.error("[Comment Handler] Error logging sent message in DB:", dbErr);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Comment Handler] Send failed:", message);

      await supabase
        .from("dm_logs")
        .update({ status: "FAILED", errorMessage: message })
        .eq("automationId", automation.id)
        .eq("commentId", commentId);

      // Retry queue
      await supabase.from("jobs").insert({
        type: "send_comment_reply",
        payload: { comment_id: commentId, message: dmMessage },
        status: "pending",
        error: message,
        attempts: 1,
      });
    }
  }
}
