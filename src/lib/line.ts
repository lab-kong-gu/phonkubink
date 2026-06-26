// LINE Login (OAuth 2.0 / OIDC) + friendship helpers.
// Docs: https://developers.line.biz/en/docs/line-login/integrate-line-login/

const AUTH_BASE = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const PROFILE_URL = "https://api.line.me/v2/profile";
const FRIENDSHIP_URL = "https://api.line.me/friendship/v1/status";

export interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// Step 1: where we send the user to log in.
// bot_prompt=aggressive shows the "add our Official Account" screen after login.
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: process.env.LINE_LOGIN_CALLBACK_URL!,
    state,
    scope: process.env.LINE_LOGIN_SCOPE || "profile openid",
    bot_prompt: "aggressive",
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

// Step 2: exchange the authorization code for an access token.
export async function exchangeCodeForToken(code: string): Promise<LineTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.LINE_LOGIN_CALLBACK_URL!,
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`LINE token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

// Step 3: fetch the user's LINE profile (this is where we get the userId).
export async function getProfile(accessToken: string): Promise<LineProfile> {
  const res = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`LINE profile fetch failed (${res.status})`);
  }
  return res.json();
}

// Step 4 (the friend gate): is this user friends with our Official Account?
export async function getFriendshipStatus(accessToken: string): Promise<boolean> {
  const res = await fetch(FRIENDSHIP_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { friendFlag: boolean };
  return Boolean(data.friendFlag);
}
