import crypto from "node:crypto";

export interface AgentTokenPayload {
  analysisId: string;
  orgId: string;
  iat: number;
  exp: number;
}

const DEFAULT_SECRET = "cartograph-agent-internal-hmac-secret-2026";

function getSecret(): string {
  return process.env.AGENT_SECRET?.trim() || DEFAULT_SECRET;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Mints a short-lived HMAC signed credential for an analysis.
 * The model/agent only receives this token and never the raw analysisId in its prompt.
 */
export function mintAgentToken(
  analysisId: string,
  orgId: string = "local-org",
  ttlSeconds: number = 900, // 15 minutes TTL
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const payload: AgentTokenPayload = {
    analysisId,
    orgId,
    iat,
    exp,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadEncoded)
    .digest("base64url");

  return `${payloadEncoded}.${signature}`;
}

/**
 * Verifies the short-lived signed credential.
 * Rejects if signature does not match or if token is expired.
 */
export function verifyAgentToken(token: string): AgentTokenPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadEncoded)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const jsonStr = base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(jsonStr) as AgentTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!payload.analysisId || !payload.exp || payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
