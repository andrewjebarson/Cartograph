import { NextRequest, NextResponse } from "next/server";
import { getAnalysis } from "@/lib/db";
import { mintAgentToken } from "@/lib/agent/credentials";

export const dynamic = "force-dynamic";

/**
 * Entry point for Phase 12 Agent Chat.
 * 1. Proves the user owns the analysis (looks up in DB).
 * 2. Mints the short-lived signed credential token (analysisId is NEVER exposed to the prompt).
 * 3. Relays the SSE stream from the standalone Agent Service.
 * 4. Gracefully fails if the Agent Service is offline (resilience check 5).
 */
export async function POST(req: NextRequest) {
  let body: {
    analysisId?: string;
    message?: string;
    threadId?: string;
    selectedContext?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const { analysisId, message, threadId, selectedContext } = body;

  if (!analysisId || !message) {
    return NextResponse.json(
      { error: "Missing required fields 'analysisId' or 'message'." },
      { status: 400 },
    );
  }

  // 1. Prove ownership of the analysis
  const analysis = getAnalysis(analysisId);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found or inaccessible." }, { status: 404 });
  }

  // 2. Mint the short-lived signed credential (TTL: 15 minutes)
  const token = mintAgentToken(analysisId, analysis.repo_owner || "local-org", 900);

  // 3. Connect to the standalone Agent Service
  const agentServiceUrl = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:3001";
  const toolsBaseUrl = req.nextUrl.origin || "http://localhost:3000";

  try {
    const agentRes = await fetch(`${agentServiceUrl.replace(/\/+$/, "")}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-cartograph-token": token,
        "x-tools-base-url": toolsBaseUrl,
      },
      body: JSON.stringify({
        message,
        threadId,
        selectedContext,
      }),
    });

    if (!agentRes.ok) {
      const errText = await agentRes.text();
      return NextResponse.json(
        { error: `Agent service error (${agentRes.status}): ${errText}` },
        { status: agentRes.status },
      );
    }

    // 4. Relay the SSE stream back to the client
    if (!agentRes.body) {
      return NextResponse.json({ error: "No response body from agent service." }, { status: 502 });
    }

    return new Response(agentRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    // 5. Resilience: If agent service is offline, return 503 with helpful status
    const isConnRefused =
      err instanceof Error &&
      (err.message.includes("ECONNREFUSED") || err.message.includes("fetch failed"));

    return NextResponse.json(
      {
        error: isConnRefused
          ? "Agent service is offline. Run `npm run agent` in a terminal to start the agent service on port 3001."
          : `Failed to communicate with agent service: ${err instanceof Error ? err.message : String(err)}`,
        status: "offline",
        code: "AGENT_SERVICE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}

/**
 * Health probe for agent service connectivity
 */
export async function GET() {
  const agentServiceUrl = process.env.AGENT_SERVICE_URL || "http://127.0.0.1:3001";
  try {
    const res = await fetch(`${agentServiceUrl.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ status: "online", service: data });
    }
  } catch {
    // offline
  }
  return NextResponse.json({ status: "offline", agentServiceUrl });
}
