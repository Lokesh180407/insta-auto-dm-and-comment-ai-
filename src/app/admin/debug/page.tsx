import { headers } from "next/headers";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getInstagramBusinessAccountId, fetchInstagramBusinessProfile } from "@/lib/instagram";

export const dynamic = "force-dynamic";

interface EnvCheck {
  key: string;
  status: "configured" | "missing";
  aliasUsed?: string;
}

export default async function DebugPage() {
  const supabase = getSupabase();

  // 1. Audit Environment Variables
  const envVars = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { key: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { key: "INSTAGRAM_ACCESS_TOKEN", value: process.env.INSTAGRAM_ACCESS_TOKEN },
    { key: "FACEBOOK_APP_SECRET", value: process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET, aliasUsed: process.env.INSTAGRAM_APP_SECRET ? "INSTAGRAM_APP_SECRET" : undefined },
    { key: "INSTAGRAM_VERIFY_TOKEN", value: process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.VERIFY_TOKEN, aliasUsed: process.env.VERIFY_TOKEN ? "VERIFY_TOKEN" : undefined },
    { key: "OPENROUTER_API_KEY", value: process.env.OPENROUTER_API_KEY },
    { key: "NEXT_PUBLIC_APP_URL", value: process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL, aliasUsed: process.env.NEXTAUTH_URL ? "NEXTAUTH_URL" : undefined },
  ];

  const auditedEnvs: EnvCheck[] = envVars.map((v) => ({
    key: v.key,
    status: v.value ? "configured" : "missing",
    aliasUsed: v.aliasUsed,
  }));

  // 2. Test Supabase Database Connectivity
  let dbStatus = "Checking...";
  let recentLogs: any[] = [];
  let recentConversations: any[] = [];
  let recentMessages: any[] = [];

  try {
    const { data: testData, error: testErr } = await supabase
      .from("instagram_conversations")
      .select("id")
      .limit(1);

    if (testErr) {
      dbStatus = `Failed: ${testErr.message}`;
    } else {
      dbStatus = "Connected successfully";

      // Fetch logs
      const { data: logs } = await supabase
        .from("dm_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      recentLogs = logs ?? [];

      // Fetch convos
      const { data: convos } = await supabase
        .from("instagram_conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5);
      recentConversations = convos ?? [];

      // Fetch messages
      const { data: msgs } = await supabase
        .from("instagram_messages")
        .select("*, instagram_conversations(username)")
        .order("created_at", { ascending: false })
        .limit(5);
      recentMessages = msgs ?? [];
    }
  } catch (err: any) {
    dbStatus = `Error: ${err.message}`;
  }

  // 3. Test Instagram Connectivity & Fetch User's Account (Satisfying "when i opens show my account")
  let instaStatus = "Checking...";
  let instaAccountName = "Unknown";
  let instaAccountUsername = "";
  let instaAccountPic = "";

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (token) {
    try {
      const bizId = await getInstagramBusinessAccountId(token);
      const profile = await fetchInstagramBusinessProfile(token, bizId);
      instaStatus = `Connected (Business ID: ${bizId})`;
      instaAccountName = profile.name ?? "No Name";
      instaAccountUsername = profile.username ?? "";
      instaAccountPic = profile.profile_picture_url ?? "";
    } catch (err: any) {
      instaStatus = `Failed: ${err.message}`;
    }
  } else {
    instaStatus = "Instagram token not configured";
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0d0f14",
      color: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: "1100px",
        margin: "0 auto",
      }}>
        {/* Header */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          paddingBottom: "1.5rem",
          marginBottom: "2rem",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "#6366f1" }}>Diagnostics Dashboard</h1>
            <p style={{ margin: "0.25rem 0 0", color: "#9ca3af" }}>System status audit & live integration debugger</p>
          </div>
          <Link href="/" style={{
            textDecoration: "none",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            color: "#818cf8",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            fontSize: "0.9rem",
            transition: "all 0.2s",
          }}>
            Back to Dashboard
          </Link>
        </header>

        {/* Connected Account Quick Status */}
        <div style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}>
          {instaAccountPic ? (
            <img src={instaAccountPic} alt="Profile" style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #6366f1" }} />
          ) : (
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#1e1b4b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              color: "#818cf8",
              border: "2px dashed #6366f1",
            }}>
              IG
            </div>
          )}
          <div>
            <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#a78bfa" }}>Active Linked Account</span>
            <h2 style={{ margin: "0.25rem 0", fontSize: "1.5rem" }}>
              {instaAccountName} {instaAccountUsername && <span style={{ color: "#9ca3af", fontSize: "1.1rem" }}>@{instaAccountUsername}</span>}
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#9ca3af" }}>
              Status: <span style={{ color: instaStatus.startsWith("Connected") ? "#10b981" : "#f43f5e" }}>{instaStatus}</span>
            </p>
          </div>
        </div>

        {/* Grid Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
          
          {/* Box 1: Env Check */}
          <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>Environment Variables</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {auditedEnvs.map((env) => (
                <div key={env.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.875rem" }}>
                  <span style={{ color: "#e2e8f0" }}>{env.key}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {env.aliasUsed && (
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", backgroundColor: "#334155", padding: "1px 6px", borderRadius: "4px" }}>
                        via {env.aliasUsed}
                      </span>
                    )}
                    <span style={{
                      color: env.status === "configured" ? "#34d399" : "#f87171",
                      backgroundColor: env.status === "configured" ? "rgba(52, 211, 153, 0.1)" : "rgba(248, 113, 113, 0.1)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                    }}>
                      {env.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box 2: Service Check */}
          <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>Service Integrations</h3>
            
            <div style={{ marginBottom: "1.25rem" }}>
              <strong style={{ display: "block", fontSize: "0.9rem", color: "#94a3b8" }}>Supabase Database Status</strong>
              <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                backgroundColor: "#0f172a",
                borderRadius: "6px",
                fontSize: "0.9rem",
                color: dbStatus.includes("Connected") ? "#34d399" : "#f87171",
              }}>
                {dbStatus}
              </div>
            </div>

            <div>
              <strong style={{ display: "block", fontSize: "0.9rem", color: "#94a3b8" }}>Meta Webhook Target</strong>
              <div style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                backgroundColor: "#0f172a",
                borderRadius: "6px",
                fontSize: "0.85rem",
                wordBreak: "break-all",
                color: "#cbd5e1"
              }}>
                Endpoint: <code>/api/webhook</code><br />
                Verify Token: <code>{process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.VERIFY_TOKEN ?? "UNSET"}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Database Logs Section */}
        <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.2rem" }}>Recent Webhook / Comment Automation Logs</h3>
          {recentLogs.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>No automation logs found in <code>dm_logs</code> table.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                    <th style={{ padding: "0.5rem" }}>Time</th>
                    <th style={{ padding: "0.5rem" }}>Trigger By</th>
                    <th style={{ padding: "0.5rem" }}>Comment Text</th>
                    <th style={{ padding: "0.5rem" }}>Status</th>
                    <th style={{ padding: "0.5rem" }}>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "0.5rem", color: "#cbd5e1" }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ padding: "0.5rem" }}>{log.commenterName ?? log.commenterId}</td>
                      <td style={{ padding: "0.5rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.commentText}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{
                          color: log.status === "SENT" ? "#34d399" : log.status === "PENDING" ? "#fbbf24" : "#f87171",
                          fontWeight: "bold"
                        }}>{log.status}</span>
                      </td>
                      <td style={{ padding: "0.5rem", color: "#ef4444", wordBreak: "break-all" }}>{log.errorMessage ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "2rem" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.2rem" }}>Recent Conversations</h3>
            {recentConversations.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>No active conversations in database.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recentConversations.map((convo) => (
                  <div key={convo.id} style={{ padding: "0.75rem", backgroundColor: "#0f172a", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ display: "block" }}>{convo.name ?? "Instagram User"} (@{convo.username ?? convo.igsid})</strong>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Updated: {new Date(convo.updated_at).toLocaleTimeString()}</span>
                    </div>
                    <span style={{
                      backgroundColor: convo.mode === "agent" ? "rgba(99, 102, 241, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: convo.mode === "agent" ? "#818cf8" : "#f87171",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold"
                    }}>{convo.mode}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.2rem" }}>Recent Messages</h3>
            {recentMessages.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>No message logs in database.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recentMessages.map((msg) => (
                  <div key={msg.id} style={{ padding: "0.75rem", backgroundColor: "#0f172a", borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
                      <span>@{msg.instagram_conversations?.username ?? "User"}</span>
                      <span style={{
                        color: msg.role === "assistant" ? "#818cf8" : "#cbd5e1"
                      }}>{msg.role}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
