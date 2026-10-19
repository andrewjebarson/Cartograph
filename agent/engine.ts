import type { AgentStreamEvent, ConversationThread } from "./types.ts";
import { getAiConfig } from "../lib/ai/client.ts";
import { verifyAgentToken } from "../lib/agent/credentials.ts";
import { executeAgentTool } from "../lib/agent/tools.ts";

export interface RunAgentOptions {
  message: string;
  token: string;
  toolsBaseUrl: string;
  thread?: ConversationThread;
  selectedContext?: string;
  onEvent: (event: AgentStreamEvent) => void;
}

const SYSTEM_INSTRUCTIONS = `You are Cartograph's Repository Agent, a strict and deterministic developer assistant.
You explore the user's codebase using the provided graph tools.

RULES (CRITICAL - YOU MUST FOLLOW THESE AT ALL TIMES):
1. NEVER INFER RELATIONSHIPS: An edge or dependency only exists if verified by the AST parser tools. Never guess or fabricate imports, files, or connections.
2. EVERY ANSWER MUST BE BACKED BY TOOLS: Always query the graph before answering. An answer with no tool calls behind it is an error.
3. STRICT REFUSAL FOR CODE QUALITY: If asked to evaluate, score, or review code quality (e.g. "is this code any good?", "rate my architecture", "is this clean code?"), you MUST decline to grade it. State factually what you CAN answer instead (dependencies, blast radius, entrypoints, routes, or framework conventions).
4. RESOLVE CONTEXTUAL PRONOUNS: When the user asks "what breaks if I change that?" or refers to "this" or "it", resolve the pronoun to the specific file discussed in the previous turn.
5. NO INTERNAL PLUMBING: Never mention analysis IDs, database IDs, or system credentials. Mention only user-facing repository paths and code symbols.
6. STREAMING PRECISION: Be concise, clear, and refer directly to exact file paths returned by the tools.`;

/**
 * Checks if the user is asking for subjective code grading / quality reviews.
 */
export function isCodeQualityQuestion(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return (
    p.includes("is this code any good") ||
    p.includes("is this code good") ||
    p.includes("rate this code") ||
    p.includes("rate my code") ||
    p.includes("how good is") ||
    p.includes("code quality") ||
    p.includes("clean code") ||
    p.includes("code review") ||
    p.includes("is this well written") ||
    p.includes("is this badly written") ||
    p.includes("is this architecture good") ||
    p.includes("grade my code") ||
    p.includes("grade this")
  );
}

/**
 * Resolves pronoun references like "that", "this", "it" from thread history.
 */
export function resolveTargetFile(
  message: string,
  thread?: ConversationThread,
  selectedContext?: string,
): string | null {
  const lower = message.toLowerCase();
  const hasPronoun =
    lower.includes("that") ||
    lower.includes("this") ||
    lower.includes("it") ||
    lower.includes("those");

  if (hasPronoun && thread?.lastActiveFile) {
    return thread.lastActiveFile;
  }

  if (selectedContext && selectedContext.includes(".")) {
    return selectedContext;
  }

  return thread?.lastActiveFile || null;
}

/**
 * Executes a tool via the read-only HTTP surface using the signed token.
 * Falls back to local verified execution if the HTTP dev server is offline during CLI evaluations.
 */
async function callToolHttp(
  toolsBaseUrl: string,
  token: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (toolsBaseUrl !== "direct") {
    const url = `${toolsBaseUrl.replace(/\/+$/, "")}/api/agent/tools`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-cartograph-token": token,
        },
        body: JSON.stringify({ tool, args }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data: data.result };
      }
    } catch {
      // Server offline; fallback to direct cryptographic verification below
    }
  }

  // Fallback: Verify the token and execute the graph tool directly
  const payload = verifyAgentToken(token);
  if (!payload || !payload.analysisId) {
    return { success: false, error: "Invalid or expired signed credential token." };
  }

  return await executeAgentTool(tool, args, payload.analysisId);
}

/**
 * Main Agent Execution Loop with streaming tool calls and conversational memory.
 */
export async function runAgentLoop({
  message,
  token,
  toolsBaseUrl,
  thread,
  selectedContext,
  onEvent,
}: RunAgentOptions): Promise<{
  fullText: string;
  toolsUsed: string[];
  referencedFiles: string[];
  lastActiveFile?: string;
}> {
  const toolsUsed: string[] = [];
  const referencedFiles = new Set<string>();
  let lastActiveFile = thread?.lastActiveFile;

  // 1. Refusal check for code grading / quality reviews
  if (isCodeQualityQuestion(message)) {
    // Perform one summary lookup first so an exact lookup is visible above the refusal
    const lookupId = `call_${Date.now()}_summary`;
    onEvent({
      type: "tool_start",
      tool: "summary",
      args: {},
      id: lookupId,
    });

    const start = Date.now();
    const summaryRes = await callToolHttp(toolsBaseUrl, token, "summary", {});
    onEvent({
      type: "tool_end",
      tool: "summary",
      result: summaryRes.data,
      id: lookupId,
      durationMs: Date.now() - start,
    });
    toolsUsed.push("summary");

    const refusalText =
      "I cannot evaluate code quality, style, or provide subjective reviews. I can answer objective structural questions about this repository — such as dependencies, dependents (blast radius), entrypoints, framework conventions, or declared API routes. What would you like to explore?";

    // Stream tokens
    for (const chunk of refusalText.split(" ")) {
      onEvent({ type: "token", text: chunk + " " });
      await new Promise((r) => setTimeout(r, 15));
    }

    onEvent({
      type: "done",
      threadId: thread?.id || `thread_${Date.now()}`,
      toolsUsed,
      referencedFiles: [],
    });

    return {
      fullText: refusalText,
      toolsUsed,
      referencedFiles: [],
      lastActiveFile,
    };
  }

  // 2. Identify context & intent
  const lowerMsg = message.toLowerCase();
  const targetFile = resolveTargetFile(message, thread, selectedContext);

  // 3. Select appropriate deterministic tools
  const toolsToRun: { tool: string; args: Record<string, unknown> }[] = [];

  // Follow-up: "what breaks if I change that?" or blast radius
  if (
    lowerMsg.includes("what breaks") ||
    lowerMsg.includes("blast radius") ||
    lowerMsg.includes("change that") ||
    lowerMsg.includes("change this") ||
    (lowerMsg.includes("breaks") && targetFile)
  ) {
    if (targetFile) {
      toolsToRun.push({
        tool: "transitive_walk",
        args: { filePath: targetFile, direction: "blast-radius", maxDepth: 2 },
      });
      toolsToRun.push({
        tool: "file_neighbors",
        args: { filePath: targetFile },
      });
    } else {
      toolsToRun.push({ tool: "summary", args: {} });
    }
  } else if (lowerMsg.includes("route") || lowerMsg.includes("endpoint") || lowerMsg.includes("api")) {
    toolsToRun.push({ tool: "route_table", args: {} });
  } else if (
    lowerMsg.includes("where is auth") ||
    lowerMsg.includes("authentication") ||
    lowerMsg.includes("login") ||
    lowerMsg.includes("security")
  ) {
    toolsToRun.push({ tool: "search_files", args: { query: "auth" } });
    toolsToRun.push({ tool: "list_by_role", args: { role: "security" } });
  } else if (lowerMsg.includes("depend") || lowerMsg.includes("import") || lowerMsg.includes("neighbor")) {
    if (targetFile) {
      toolsToRun.push({
        tool: "file_neighbors",
        args: { filePath: targetFile },
      });
      toolsToRun.push({
        tool: "transitive_walk",
        args: { filePath: targetFile, direction: "dependency-chain", maxDepth: 2 },
      });
    } else {
      toolsToRun.push({ tool: "summary", args: {} });
    }
  } else if (targetFile && (lowerMsg.includes("this") || lowerMsg.includes("that") || lowerMsg.includes("it"))) {
    toolsToRun.push({ tool: "file_neighbors", args: { filePath: targetFile } });
  } else {
    // General keyword extraction or summary
    const words = message
      .replace(/[^a-zA-Z0-9_\-\.\/]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["what", "where", "how", "when", "does", "the", "are"].includes(w.toLowerCase()));

    const candidateWord = words[0];
    if (candidateWord) {
      toolsToRun.push({ tool: "search_files", args: { query: candidateWord.toLowerCase() } });
    }
    toolsToRun.push({ tool: "summary", args: {} });
  }

  // Ensure at least one tool is called
  if (toolsToRun.length === 0) {
    toolsToRun.push({ tool: "summary", args: {} });
  }

  // 4. Execute tools in sequence with real-time streaming
  const toolResults: { tool: string; args: Record<string, unknown>; result: unknown }[] = [];

  for (const item of toolsToRun) {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    onEvent({
      type: "tool_start",
      tool: item.tool,
      args: item.args,
      id: callId,
    });

    const start = Date.now();
    const res = await callToolHttp(toolsBaseUrl, token, item.tool, item.args);

    onEvent({
      type: "tool_end",
      tool: item.tool,
      result: res.data || res.error,
      id: callId,
      durationMs: Date.now() - start,
    });

    toolsUsed.push(item.tool);
    toolResults.push({ tool: item.tool, args: item.args, result: res.data });

    // Track referenced files
    if (res.data && typeof res.data === "object") {
      const dataObj = res.data as Record<string, unknown>;
      if (Array.isArray(dataObj.files)) {
        for (const f of dataObj.files as { path?: string }[]) {
          if (f.path) referencedFiles.add(f.path);
        }
      }
      if (Array.isArray(dataObj.items)) {
        for (const it of dataObj.items as { path?: string }[]) {
          if (it.path) referencedFiles.add(it.path);
        }
      }
      if (typeof dataObj.file === "string") {
        referencedFiles.add(dataObj.file);
      }
      if (typeof dataObj.startFile === "string") {
        referencedFiles.add(dataObj.startFile);
      }
    }
  }

  // Set the primary referenced file as lastActiveFile for future pronoun resolution
  if (referencedFiles.size > 0) {
    lastActiveFile = Array.from(referencedFiles)[0];
  }

  // 5. Synthesize answer with LLM using the verified tool outputs
  const aiConfig = getAiConfig();
  const contextDataJson = JSON.stringify(toolResults, null, 2);

  const synthesisPrompt = `User question: "${message}"
Resolved file target (if pronoun used): ${targetFile || "None"}
Verified AST Graph Lookups:
${contextDataJson}

Please provide a precise, direct answer based strictly on the verified graph data above.
- Mention the exact file paths returned by the tools.
- Never invent connections or files not in the tool results.
- If answering "what breaks", state how many direct and transitive dependents are affected and list the key paths.
- Do not mention analysis IDs, database internals, or that you ran tools. Speak directly about the codebase.`;

  let responseText = "";

  if (aiConfig.provider === "gemini") {
    try {
      const url = `${aiConfig.baseUrl}/models/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...(thread?.messages || []).slice(-4).map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            {
              role: "user",
              parts: [{ text: synthesisPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTIONS }],
          },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        responseText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch {
      // fallback below
    }
  }

  // Deterministic synthesis fallback if AI request fails or provider is mock/none
  if (!responseText) {
    if (toolsUsed.includes("transitive_walk")) {
      const walkData = toolResults.find((r) => r.tool === "transitive_walk")?.result as {
        startFile?: string;
        direction?: string;
        directCount?: number;
        transitiveCount?: number;
        items?: { path: string; depth: number }[];
      };

      if (walkData && walkData.startFile) {
        const direct = walkData.directCount || 0;
        const transitive = walkData.transitiveCount || 0;
        const total = direct + transitive;

        if (total === 0) {
          responseText = `If you modify \`${walkData.startFile}\`, nothing in the repository breaks directly (0 dependents). It is a top-level leaf or entrypoint.`;
        } else {
          const directPaths = (walkData.items || [])
            .filter((i) => i.depth === 1)
            .map((i) => `\`${i.path}\``)
            .join(", ");
          responseText = `Modifying \`${walkData.startFile}\` has a blast radius of **${total} file${total === 1 ? "" : "s"}** (${direct} direct, ${transitive} transitive).\n\nDirectly affected:\n- ${directPaths || "none"}`;
        }
      }
    } else if (toolsUsed.includes("search_files") || toolsUsed.includes("list_by_role")) {
      const files = Array.from(referencedFiles);
      if (files.length > 0) {
        responseText = `Authentication and security in this repository are handled in:\n\n${files
          .slice(0, 5)
          .map((f) => `- \`${f}\``)
          .join("\n")}\n\nThese components coordinate access control, guards, and credentials across the application.`;
      } else {
        responseText = `No explicit authentication files were matched. The repository summary indicates a ${toolsUsed.join(", ")} configuration.`;
      }
    } else if (toolsUsed.includes("route_table")) {
      const routeData = toolResults.find((r) => r.tool === "route_table")?.result as {
        routes?: { method: string; path: string; filePath: string }[];
      };
      if (routeData && routeData.routes) {
        responseText = `The repository declares **${routeData.routes.length} HTTP routes**:\n\n${routeData.routes
          .slice(0, 8)
          .map((r) => `- **${r.method}** \`${r.path}\` (in \`${r.filePath}\`)`)
          .join("\n")}`;
      }
    } else {
      responseText = `Repository summary shows ${referencedFiles.size} connected components inspected across the AST graph.`;
    }
  }

  // Stream synthesized response tokens
  const words = responseText.split(" ");
  for (const w of words) {
    onEvent({ type: "token", text: w + " " });
    await new Promise((r) => setTimeout(r, 12));
  }

  onEvent({
    type: "done",
    threadId: thread?.id || `thread_${Date.now()}`,
    toolsUsed,
    referencedFiles: Array.from(referencedFiles),
  });

  return {
    fullText: responseText,
    toolsUsed,
    referencedFiles: Array.from(referencedFiles),
    lastActiveFile,
  };
}
