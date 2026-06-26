import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthorizationUrl } from "@/lib/line";

export const runtime = "nodejs";

// Kick off LINE Login: make a random `state`, stash it in a short-lived
// cookie (CSRF protection), then redirect the user to LINE.
export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getAuthorizationUrl(state));
  res.cookies.set("line_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
