import { cookies } from "next/headers";
import crypto from "node:crypto";

export const AUTH_COOKIE = "cartograph_auth_session";
const AUTH_SECRET = process.env.AGENT_SECRET || "cartograph-local-auth-secret-key-2026";

export interface SessionUser {
  username: string;
  role: "admin";
}

function signSession(username: string): string {
  const data = JSON.stringify({ username, iat: Date.now() });
  const b64 = Buffer.from(data).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(b64).digest("base64url");
  return `${b64}.${signature}`;
}

function verifySession(token: string): SessionUser | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [b64, signature] = parts;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(b64).digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const raw = Buffer.from(b64, "base64url").toString("utf-8");
    const json = JSON.parse(raw);
    if (!json.username) return null;
    return { username: json.username, role: "admin" };
  } catch {
    return null;
  }
}

/**
 * Checks if the current visitor is authenticated via cookie.
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token) !== null;
}

/**
 * Retrieves the currently logged-in user profile if authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Validates local username & password against .env.local and sets HTTP-only cookie.
 */
export async function loginWithCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = (process.env.AUTH_USERNAME || "admin").trim();
  const expectedPass = (process.env.AUTH_PASSWORD || "admin").trim();

  const userMatch = username.trim() === expectedUser;
  const passMatch = password.trim() === expectedPass;

  if (!userMatch || !passMatch) {
    return false;
  }

  const token = signSession(username.trim());
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return true;
}

/**
 * Clears the session cookie to sign out.
 */
export async function logoutSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
