"use client";

import React, { useState, useEffect, useRef } from "react";

export interface ToolCallUI {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "running" | "done";
  durationMs?: number;
  isOpen?: boolean;
}

export interface ChatMessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallUI[];
  createdAt: string;
}

interface AskPanelProps {
  analysisId?: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

const SAMPLE_QUESTIONS = [
  "Where is authentication handled?",
  "What breaks if I change that?",
  "Is this code any good?",
  "Show declared HTTP routes",
];

export function AskPanel({
  analysisId,
  selectedId,
  onSelect,
  onClose,
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessageUI[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I am Cartograph's Repository Agent. I can answer questions about this codebase using deterministic AST graph tools — verifying dependencies, blast radius, entrypoints, and API routes.\n\nEvery answer is backed by verified lookups.",
      createdAt: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId] = useState<string>(() => `thread_${Math.random().toString(36).substring(2, 9)}`);
  const [agentStatus, setAgentStatus] = useState<"checking" | "online" | "offline">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const msgCounterRef = useRef(0);

  // Probe agent service status
  useEffect(() => {
    let isMounted = true;
    fetch("/api/agent/chat")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setAgentStatus(data.status === "online" ? "online" : "offline");
      })
      .catch(() => {
        if (isMounted) setAgentStatus("offline");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const toggleToolDetails = (msgId: string, toolId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId || !msg.toolCalls) return msg;
        return {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) =>
            tc.id === toolId ? { ...tc, isOpen: !tc.isOpen } : tc,
          ),
        };
      }),
    );
  };

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isStreaming) return;

    setInput("");
    setErrorMessage(null);

    msgCounterRef.current += 1;
    const count = msgCounterRef.current;
    const userMsgId = `msg_u_${count}`;
    const assistantMsgId = `msg_a_${count}`;

    const userMessage: ChatMessageUI = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    const initialAssistantMsg: ChatMessageUI = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      toolCalls: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMsg]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysisId || "default",
          message: textToSend,
          threadId,
          selectedContext: selectedId || undefined,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (res.status === 503) {
          setAgentStatus("offline");
        }
        throw new Error(errorJson.error || `Request failed (${res.status})`);
      }

      setAgentStatus("online");

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream received.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          // Block format: event: <type>\ndata: <json>
          let eventType = "message";
          let dataStr = "";

          for (const line of trimmed.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === "tool_start") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  const toolCalls = msg.toolCalls || [];
                  return {
                    ...msg,
                    toolCalls: [
                      ...toolCalls,
                      {
                        id: data.id || `tool_${Date.now()}`,
                        tool: data.tool,
                        args: data.args || {},
                        status: "running",
                        isOpen: false,
                      },
                    ],
                  };
                }),
              );
            } else if (eventType === "tool_end") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  const toolCalls = msg.toolCalls || [];
                  return {
                    ...msg,
                    toolCalls: toolCalls.map((tc) =>
                      tc.id === data.id || tc.tool === data.tool
                        ? {
                            ...tc,
                            status: "done",
                            result: data.result,
                            durationMs: data.durationMs,
                          }
                        : tc,
                    ),
                  };
                }),
              );
            } else if (eventType === "token") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMsgId) return msg;
                  return {
                    ...msg,
                    content: msg.content + data.text,
                  };
                }),
              );
            } else if (eventType === "error") {
              setErrorMessage(data.error || "An error occurred during agent execution.");
            }
          } catch {
            // ignore partial JSON parse errors in stream
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && !m.content
            ? { ...m, content: `Error: ${msg}` }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Render markdown text with clickable file paths
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        const rawPath = part.slice(1, -1);
        const isFilePath = rawPath.includes("/") || rawPath.includes(".");
        if (isFilePath) {
          return (
            <button
              key={i}
              onClick={() => onSelect(rawPath)}
              className="inline font-mono text-[11px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium hover:underline hover:bg-amber-500/20 transition-colors"
              title="Click to view file in map"
            >
              {rawPath}
            </button>
          );
        }
        return (
          <code key={i} className="font-mono text-[11px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
            {rawPath}
          </code>
        );
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  return (
    <aside className="w-84 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full select-none overflow-hidden">
      {/* Pane Header */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Ask Repository
            </span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                agentStatus === "online"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                  : agentStatus === "offline"
                    ? "bg-zinc-400 dark:bg-zinc-600"
                    : "bg-amber-500 animate-pulse"
              }`}
              title={
                agentStatus === "online"
                  ? "Agent service is online on port 3001"
                  : "Agent service is offline. Run 'npm run agent' to start"
              }
            />
          </div>

          <button
            onClick={onClose}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 transition-colors"
            title="Return to inspector"
          >
            ← Exit Ask
          </button>
        </div>

        {/* Selected Context Indicator */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
          <span className="text-zinc-400">Context:</span>
          {selectedId ? (
            <span className="text-amber-600 dark:text-amber-400 truncate max-w-[180px] font-medium" title={selectedId}>
              {selectedId.split("/").pop()}
            </span>
          ) : (
            <span className="text-zinc-400 italic">Whole repository</span>
          )}
        </div>
      </div>

      {/* Offline Alert Banner */}
      {agentStatus === "offline" && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 text-[11px] font-mono text-amber-700 dark:text-amber-300">
          <div className="font-semibold">Agent Service Offline</div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Run <code className="bg-amber-500/20 px-1 py-0.2 rounded font-bold">npm run agent</code> in a terminal to launch the agent service on port 3001.
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="text-[9px] font-mono text-zinc-400 mb-1">
                {isUser ? "You" : "Cartograph Agent"}
              </div>

              {/* Tool Calls List (above the answer as required by spec) */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="w-full space-y-1.5 mb-2">
                  {msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-1.5 text-[11px] font-mono"
                    >
                      <div
                        onClick={() => toggleToolDetails(msg.id, tc.id)}
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tc.status === "running"
                                ? "bg-amber-500 animate-ping"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {tc.tool}
                          </span>
                          <span className="text-zinc-400 text-[10px] truncate max-w-[120px]">
                            {JSON.stringify(tc.args)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                          {tc.durationMs !== undefined && (
                            <span>{tc.durationMs}ms</span>
                          )}
                          <span>{tc.isOpen ? "▴" : "▾"}</span>
                        </div>
                      </div>

                      {/* Expanded Tool Data */}
                      {tc.isOpen && (
                        <div className="mt-1.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-800 text-[10px] max-h-36 overflow-y-auto">
                          <div className="text-zinc-400 mb-0.5">Parameters:</div>
                          <pre className="p-1 rounded bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(tc.args, null, 2)}
                          </pre>
                          {tc.result !== undefined && (
                            <>
                              <div className="text-zinc-400 mt-1 mb-0.5">Lookup Result:</div>
                              <pre className="p-1 rounded bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(tc.result, null, 2)}
                              </pre>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`rounded-lg px-2.5 py-2 text-xs font-sans leading-relaxed max-w-[95%] ${
                  isUser
                    ? "bg-amber-600 text-white font-medium self-end"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 self-start border border-zinc-200 dark:border-zinc-800/80"
                }`}
              >
                {msg.content ? (
                  <div className="whitespace-pre-wrap">
                    {renderFormattedText(msg.content)}
                  </div>
                ) : isStreaming ? (
                  <div className="flex items-center gap-1 py-1 text-zinc-400 font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-200" />
                    <span className="ml-1 text-[10px]">Looking up graph...</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {errorMessage && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-[11px]">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Suggested Questions Prompt Chips */}
      <div className="shrink-0 px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="text-[10px] font-mono text-zinc-400 mb-1">Suggested questions:</div>
        <div className="flex flex-wrap gap-1">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              disabled={isStreaming}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about dependencies, routes, or blast radius..."
            disabled={isStreaming}
            className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="h-8 px-3 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-mono text-xs font-medium transition-colors"
          >
            {isStreaming ? "..." : "Ask"}
          </button>
        </form>
      </div>
    </aside>
  );
}
