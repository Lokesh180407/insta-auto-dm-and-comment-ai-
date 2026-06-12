import OpenAI from "openai";
import { INSTAGRAM_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { createClient } from "@supabase/supabase-js";

// We'll use a separate instance for embeddings if needed, but OpenRouter doesn't easily support 1536-dim embeddings.
// We'll assume OPENAI_API_KEY is provided for embeddings, or fallback to a mock if unavailable.
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const openaiEmbeddings = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy", // use standard OpenAI for text-embedding-3-small
});

// Create a supabase client for vector searches
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FALLBACK_MODELS = [
  process.env.AI_MODEL,
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
].filter(Boolean) as string[];

/**
 * Generate a 1536-dimensional embedding for text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    // If no key is set, return a zero vector so we don't break the app
    // In production, an OPENAI_API_KEY should be set.
    console.warn("OPENAI_API_KEY not set. Using dummy zero vector for embedding.");
    return new Array(1536).fill(0);
  }
  
  const response = await openaiEmbeddings.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " "),
  });
  return response.data[0].embedding;
}

/**
 * Fetch knowledge base context relevant to the user query.
 */
async function getRelevantContext(query: string): Promise<string> {
  try {
    const embedding = await generateEmbedding(query);
    
    // Call our newly added match_embeddings RPC
    const { data: chunks, error } = await supabase.rpc("match_embeddings", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3,
    });
    
    if (error) {
      console.error("Vector search error:", error);
      return "";
    }
    
    if (!chunks || chunks.length === 0) return "";
    
    return chunks.map((c: any) => c.chunk_text).join("\n\n");
  } catch (err) {
    console.error("Error fetching context:", err);
    return "";
  }
}

export async function getAIResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  customSystemPrompt?: string | null
) {
  let systemPrompt = customSystemPrompt?.trim() || INSTAGRAM_SYSTEM_PROMPT;
  
  // Extract the latest user query to fetch context
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content;
  
  if (lastUserMsg) {
    const context = await getRelevantContext(lastUserMsg);
    if (context) {
      systemPrompt += `\n\n### KNOWLEDGE BASE CONTEXT ###\nYou have access to the following relevant information from the knowledge base. Use it to answer the user's questions if applicable.\n\n${context}\n\n### END KNOWLEDGE BASE ###`;
    }
  }

  const payload = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];

  for (const model of FALLBACK_MODELS) {
    try {
      const completion = await openai.chat.completions.create({ model, messages: payload });
      return completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      // Only fall through on rate-limit (429) or not-found (404), throw everything else
      if (status !== 429 && status !== 404) throw err;
      console.warn(`Model ${model} failed with ${status}, trying next...`);
    }
  }

  return "Sorry, I'm temporarily unavailable. Please try again shortly.";
}
