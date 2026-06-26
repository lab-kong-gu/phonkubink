// Minimal signed-cookie session — no external dependencies.
// The cookie holds the LINE userId, signed with HMAC-SHA256 using SESSION_SECRET
// so it can't be tampered with. (It is signed, not encrypted — fine for an opaque ID.)

import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
export const SESSION_COOKIE = "tk_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function hmac(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function signSession(lineUserId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: lineUserId, iat: Date.now() })
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.sub === "string" ? data.sub : null;
  } catch {
    return null;
  }
}

// Read the logged-in userId inside a Server Component or route handler.
export function getSessionUserId(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};
