# Phase 0 — LINE Setup (ผ่อนกับอิ้ง / Ticketify)

Goal of Phase 0: get all your LINE accounts and credentials created **before writing any code**, so the shared `userId` works across your website and your LINE Official Account.

This is all console clicks — no code yet. Work top to bottom. When you collect a value, paste it into `.env.local` (copy it from `.env.local.example`).

> ⚠️ I can't do these steps for you — they require logging into your own LINE account and creating channels. Follow along and fill in the credentials as you go.

---

## The big idea (why order matters)

One **Provider** holds two **channels**:

```
Provider:  "Pon Kab Ing" (ผ่อนกับอิ้ง)
   ├── LINE Login channel        ← website login (OAuth)
   └── Messaging API channel     ← your Official Account (push bills/receipts)
```

Because both channels live under the **same provider**, LINE gives you the **same `userId`** for a given user on both. That single ID is the glue between your website and your LINE bot. If you create them under different providers, the IDs won't match and the whole "buy on web → bill in LINE" flow breaks.

---

## Step 1 — Create a LINE Developers account

1. Go to https://developers.line.biz/console/
2. Log in with your LINE account (the one you'll run the business from).
3. Agree to the developer terms if prompted.

## Step 2 — Create a Provider

1. In the console, click **Create a new provider**.
2. Name it something stable like `Pon Kab Ing` (this name is internal-ish; pick something you won't want to change).
3. Create it. You're now inside the provider — both channels below go here.

## Step 3 — Create the LINE Login channel (website auth)

1. Inside the provider, click **Create a new channel** → choose **LINE Login**.
2. Fill in:
   - **Channel name**: `ผ่อนกับอิ้ง` (this shows on the login consent screen — pick the user-facing name)
   - **Channel description**: short description
   - **App types**: check **Web app**
   - Region, email, etc. as required
3. Create it.
4. Open the channel → **LINE Login** tab → set **Callback URL**:
   - For local dev: `http://localhost:3000/api/auth/line/callback`
   - You can add multiple (one per line). Add your production HTTPS URL later.
5. Collect from the **Basic settings** tab:
   - **Channel ID** → `LINE_LOGIN_CHANNEL_ID`
   - **Channel secret** → `LINE_LOGIN_CHANNEL_SECRET`

## Step 4 — Create the Messaging API channel (your Official Account)

1. Back in the **same provider**, click **Create a new channel** → choose **Messaging API**.
2. Fill in the name/description/category. Creating this also creates a **LINE Official Account (OA)**.
3. Open the channel → **Messaging API** tab:
   - Issue a **Channel access token (long-lived)** → `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`
   - Note the **Channel secret** (Basic settings tab) → `LINE_MESSAGING_CHANNEL_SECRET`
   - You'll set the **Webhook URL** later (Phase 4), when you have a server to receive events.

## Step 5 — Link the Login channel to your OA (the friend-gate)

This is what makes "add our OA as a friend" appear on the login screen.

1. Open your **LINE Login channel** → **LINE Login** tab.
2. Find **Linked LINE Official Account** → select the OA you just created in Step 4.
3. Save.

Now, when your auth URL includes `bot_prompt=aggressive`, users get an add-friend screen after logging in, and you can verify the result with the friendship-status API.

## Step 6 — (Optional now) Apply for email permission

Only if you need the user's email at login.

1. **LINE Login channel** → **Basic settings** tab → **OpenID Connect** → **Email address permission** → **Apply**.
2. Agree to terms and upload a screenshot of the screen where you explain you're collecting email and why.
3. Once approved, you can include `email` in your scope (you must also include `openid`).

You can skip this for v0 and add it later — don't let approval block you.

---

## What you'll wire up in later phases (so the values make sense)

- **Authorization URL** (Phase 2) will use:
  `LINE_LOGIN_CHANNEL_ID`, the callback URL, `scope=profile openid` (+`email` if approved), a random `state`, and `bot_prompt=aggressive`.
- **Token exchange** (Phase 2) uses `LINE_LOGIN_CHANNEL_ID` + `LINE_LOGIN_CHANNEL_SECRET`.
- **Friendship check** (Phase 2) calls `GET https://api.line.me/friendship/v1/status` with the user's access token; gate the dashboard if `friendFlag` is false.
- **Push bills/receipts** (Phase 4) uses `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` to `POST /v2/bot/message/push` to the same `userId`.

---

## Phase 0 checklist

- [ ] Step 1 — Developer account created
- [ ] Step 2 — Provider created
- [ ] Step 3 — LINE Login channel created + callback URL set
- [ ] Step 3 — `LINE_LOGIN_CHANNEL_ID` collected
- [ ] Step 3 — `LINE_LOGIN_CHANNEL_SECRET` collected
- [ ] Step 4 — Messaging API channel / OA created
- [ ] Step 4 — `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` issued + collected
- [ ] Step 4 — `LINE_MESSAGING_CHANNEL_SECRET` collected
- [ ] Step 5 — Login channel linked to the OA
- [ ] Step 6 — (optional) Email permission applied for

When every box above is ticked and `.env.local` is filled in, Phase 0 is done — the next step is Phase 1 (Next.js skeleton + DB schema), then Phase 2 (the login flow that prints your own `userId` on screen).

---

### Security note
`.env.local` holds secrets (channel secret + access token). It must **never** be committed to git — the included `.gitignore` already excludes it. Treat the access token like a password; anyone with it can send messages as your OA.

Reference docs:
- Link a bot / add-friend option: https://developers.line.biz/en/docs/line-login/link-a-bot/
- Integrating LINE Login: https://developers.line.biz/en/docs/line-login/integrate-line-login/
- Provider/channel best practices: https://developers.line.biz/en/docs/line-developers-console/best-practices-for-provider-and-channel-management/
