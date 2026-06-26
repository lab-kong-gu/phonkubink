import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const base = process.env.APP_BASE_URL || new URL(req.url).origin;
  const res = NextResponse.redirect(`${base}/`);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
