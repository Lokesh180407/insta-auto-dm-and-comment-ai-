import { supabase } from "@/lib/supabase";

export async function GET() {
  // Auto-cleanup expired conversations (older than 24 hours)
  try {
    await supabase
      .from("instagram_conversations")
      .delete()
      .lt("can_reply_until", new Date().toISOString());
  } catch (cleanupErr) {
    console.error("[Conversations API] Cleanup failed:", cleanupErr);
  }

  // Fetch only conversations where we have sent a DM (role = assistant)
  const { data: conversations, error } = await supabase
    .from("instagram_conversations")
    .select("*, instagram_messages!inner(role)")
    .eq("instagram_messages.role", "assistant")
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Clean the inner join reference so it doesn't pollute the object structure
  const cleanConversations = (conversations || []).map((convo: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { instagram_messages, ...rest } = convo;
    return rest;
  });

  // Fetch last message for each conversation
  const withLastMessage = await Promise.all(
    cleanConversations.map(async (convo) => {
      const { data: messages } = await supabase
        .from("instagram_messages")
        .select("content, role, created_at")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        ...convo,
        last_message: messages?.[0]?.content || null,
      };
    })
  );

  return Response.json(withLastMessage);
}
