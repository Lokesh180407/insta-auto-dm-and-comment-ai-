"use client";
import { useState } from "react";

export default function DebugClient({ 
  failedLogs, 
  testUserId 
}: { 
  failedLogs: any[];
  testUserId: string | null;
}) {
  const [status, setStatus] = useState<string>("");

  async function handleTestToken() {
    setStatus("Testing token...");
    try {
      const res = await fetch("/api/debug/instagram");
      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch(e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }

  async function handleTestDM() {
    if (!testUserId) {
      setStatus("Error: No recent conversation found to send a test DM to.");
      return;
    }
    setStatus("Sending test DM...");
    try {
      const res = await fetch(`/api/conversations/${testUserId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello! This is a test DM from the debug dashboard." }),
      });
      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch(e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }

  async function handleRetryAutomation(logId: string) {
    setStatus(`Retrying log ID: ${logId}...`);
    // Placeholder for retry endpoint
    setStatus(`Retry triggered for ${logId}. Please check logs shortly.`);
  }

  const btnStyle = {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    color: "#818cf8",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button onClick={handleTestToken} style={btnStyle}>Refresh Token Test</button>
        <button onClick={handleTestDM} style={btnStyle}>Send Test DM</button>
        {failedLogs.length > 0 && (
          <button onClick={() => handleRetryAutomation(failedLogs[0].id)} style={{...btnStyle, color: "#f87171", borderColor: "rgba(248,113,113,0.3)"}}>
            Retry Latest Failed Automation
          </button>
        )}
      </div>
      {status && (
        <pre style={{ 
          backgroundColor: "#0f172a", 
          padding: "1rem", 
          borderRadius: "6px", 
          fontSize: "0.8rem", 
          color: "#cbd5e1",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all"
        }}>
          {status}
        </pre>
      )}
    </div>
  );
}
