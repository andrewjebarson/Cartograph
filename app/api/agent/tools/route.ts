import { NextRequest, NextResponse } from "next/server";
import { verifyAgentToken } from "@/lib/agent/credentials";
import { executeAgentTool, AGENT_TOOLS } from "@/lib/agent/tools";

/**
 * Read-only HTTP surface for agent tools.
 * Scoped strictly to the analysis named in the short-lived signed credential.
 * Rejects requests without a valid cryptographic token.
 */
export async function POST(req: NextRequest) {
  // Extract token from Authorization header or custom header
  const authHeader = req.headers.get("authorization") || "";
  const customHeader = req.headers.get("x-cartograph-token") || "";

  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  }

  if (!token) {
    return NextResponse.json(
      { error: "Missing signed credential token in Authorization or x-cartograph-token header." },
      { status: 401 },
    );
  }

  const payload = verifyAgentToken(token);
  if (!payload || !payload.analysisId) {
    return NextResponse.json(
      { error: "Invalid, tampered, or expired agent credential token." },
      { status: 401 },
    );
  }

  let body: { tool?: string; args?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const { tool, args = {} } = body;
  if (!tool) {
    return NextResponse.json(
      {
        error: "Missing tool name.",
        availableTools: AGENT_TOOLS.map((t) => t.name),
      },
      { status: 400 },
    );
  }

  const result = await executeAgentTool(tool, args, payload.analysisId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    tool,
    result: result.data,
  });
}

export async function GET() {
  return NextResponse.json({
    description: "Cartograph Read-only Agent Tools API",
    tools: AGENT_TOOLS,
  });
}
