import http from "node:http";
import "../lib/evals/env.ts"; // Load .env.local if present
import type { ConversationThread, AgentStreamEvent } from "./types.ts";
import { runAgentLoop } from "./engine.ts";

const PORT = parseInt(process.env.AGENT_PORT || "3001", 10);
const threads = new Map<string, ConversationThread>();

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cartograph-token, x-tools-base-url");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === "GET" && (req.url === "/health" || req.url === "/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "cartograph-agent",
        port: PORT,
        activeThreads: threads.size,
      }),
    );
    return;
  }

  // Chat endpoint
  if (req.method === "POST" && req.url === "/chat") {
    const authHeader = req.headers["authorization"] || "";
    const customHeader = (req.headers["x-cartograph-token"] as string) || "";
    const toolsBaseUrl =
      (req.headers["x-tools-base-url"] as string) ||
      process.env.TOOLS_BASE_URL ||
      "http://localhost:3000";

    let token = "";
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (customHeader) {
      token = customHeader.trim();
    }

    if (!token) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Unauthorized: Missing signed credential token in Authorization or x-cartograph-token header.",
        }),
      );
      return;
    }

    // Read body
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
    });

    req.on("end", async () => {
      try {
        const body = JSON.parse(bodyText || "{}");
        const { message, threadId = `thread_${Date.now()}`, selectedContext } = body;

        if (!message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required field 'message'." }));
          return;
        }

        // Get or initialize conversation thread
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

        // SSE Response headers
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        });

        // Add user message to history
        thread.messages.push({
          id: `msg_${Date.now()}_u`,
          role: "user",
          content: message,
          createdAt: new Date().toISOString(),
        });

        // Run agent loop and stream events
        const result = await runAgentLoop({
          message,
          token,
          toolsBaseUrl,
          thread,
          selectedContext,
          onEvent: (event: AgentStreamEvent) => {
            res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
          },
        });

        // Update thread history
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

        res.end();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        res.write(`event: error\ndata: ${JSON.stringify({ error: errMsg })}\n\n`);
        res.end();
      }
    });

    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`==========================================================`);
  console.log(`  CARTOGRAPH: PHASE 12 AGENT SERVICE`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Tools Base URL: ${process.env.TOOLS_BASE_URL || "http://localhost:3000"}`);
  console.log(`==========================================================`);
});
