import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getProfile, getFriendshipStatus } from "@/lib/line";
import { prisma } from "@/lib/prisma";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

// LINE redirects back here with ?code & ?state.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = process.env.APP_BASE_URL || url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${base}/?error=${encodeURIComponent(oauthError)}`);
  }

  // Verify state matches the cookie we set at login (CSRF check).
  const savedState = req.cookies.get("line_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${base}/?error=invalid_state`);
  }

  try {
    const token = await exchangeCodeForToken(code);
    const profile = await getProfile(token.access_token);
    const isFriend = await getFriendshipStatus(token.access_token);

    // Upsert the user — keyed by LINE userId (the glue across web + LINE).
    await prisma.user.upsert({
      where: { lineUserId: profile.userId },
      update: {
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
      },
      create: {
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
      },
    });

    // Friend gate: friends go to the dashboard, others to the add-friend page.
    const dest = isFriend ? `${base}/dashboard` : `${base}/add-friend`;
    const res = NextResponse.redirect(dest);
    res.cookies.set(SESSION_COOKIE, signSession(profile.userId), sessionCookieOptions);
    res.cookies.delete("line_oauth_state");
    return res;
  } catch (e) {
    console.error("LINE callback error:", e);
    return NextResponse.redirect(`${base}/?error=login_failed`);
  }
}
