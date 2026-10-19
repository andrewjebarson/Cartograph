import { NextRequest, NextResponse } from "next/server";
import { getAnalysis } from "@/lib/db";
import { mintAgentToken } from "@/lib/agent/credentials";
import { runAgentLoop } from "@/agent/engine";
import type { ConversationThread, AgentStreamEvent } from "@/agent/types";
import { getAiConfig } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

// In-memory conversation threads for session continuity
const threads = new Map<string, ConversationThread>();

/**
 * Entry point for Phase 12 Agent Chat.
 * Runs directly inside Next.js (no separate port needed).
 * 1. Proves the user owns the analysis (looks up in DB).
 * 2. Mints the short-lived signed credential token (analysisId is NEVER exposed to the prompt).
 * 3. Streams tool execution and responses directly over SSE.
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

  const { analysisId, message, threadId = `thread_${Date.now()}`, selectedContext } = body;

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

  // 3. Get or initialize conversation thread
  let thread = threads.get(threadId);
  if (!thread) {
    thread = {
      id: threadId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    threads.set(threadId, thread);
  }

  // Add user message to history
  thread.messages.push({
    id: `msg_${Date.now()}_u`,
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  });

  const encoder = new TextEncoder();
  const toolsBaseUrl = req.nextUrl.origin || "http://localhost:3000";

  // 4. Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runAgentLoop({
          message,
          token,
          toolsBaseUrl,
          thread,
          selectedContext,
          onEvent: (event: AgentStreamEvent) => {
            controller.enqueue(
              encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
            );
          },
        });

        // Update thread history
        if (thread) {
          thread.messages.push({
            id: `msg_${Date.now()}_a`,
            role: "assistant",
            content: result.fullText,
            createdAt: new Date().toISOString(),
          });
          if (result.lastActiveFile) {
            thread.lastActiveFile = result.lastActiveFile;
          }
          thread.updatedAt = new Date().toISOString();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errMsg })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Health probe for agent service connectivity
 */
export async function GET() {
  const aiConfig = getAiConfig();
  return NextResponse.json({
    status: "online",
    mode: "internal",
    provider: aiConfig.provider,
    model: aiConfig.model,
    activeThreads: threads.size,
  });
}
