export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: AgentToolCall[];
  createdAt: string;
}

export interface ConversationThread {
  id: string;
  messages: ChatMessage[];
  lastActiveFile?: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentStreamEvent =
  | { type: "tool_start"; tool: string; args: Record<string, unknown>; id: string }
  | { type: "tool_end"; tool: string; result: unknown; id: string; durationMs: number }
  | { type: "token"; text: string }
  | { type: "done"; threadId: string; toolsUsed: string[]; referencedFiles: string[] }
  | { type: "error"; error: string };
