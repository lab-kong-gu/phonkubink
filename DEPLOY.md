# Deploy to Vercel (test site)

Stack: Next.js + Prisma + Supabase (Postgres + Storage) + LINE Login.

## 0. Before anything — sync the database
The deployed code expects the latest schema (new order statuses + customer name/phone +
Phase 4's payment/reminder fields on Installment, isFriend on User, and the
deposit/partial-payment fields — Installment.amountPaid, the PARTIAL status, and the
new PaymentLog table).
Run once against your Supabase DB:
```bash
npm run db:push
npm run db:generate
```

## 1. Push the code to GitHub
1. Create a new **empty** repo on https://github.com (no README/gitignore — we already have one). Name it e.g. `ticketify`.
2. In the project folder:
```bash
git init            # (skip if already a repo)
git add .
git commit -m "Ticketify app"
git branch -M main
git remote add origin https://github.com/<your-username>/ticketify.git
git push -u origin main
```
> `.env.local` and `node_modules` are gitignored, so **no secrets go to GitHub.** ✅
> (You can delete the stray `poster.png` test file first if you like.)

## 2. Import into Vercel
1. Go to https://vercel.com → sign in with GitHub → **Add New… → Project**.
2. Import your `ticketify` repo. Framework auto-detects as **Next.js** — leave the build settings default.
3. Open **Environment Variables** and add every row below (copy the values from your local `.env.local`):

| Key | Value |
| --- | --- |
| `LINE_LOGIN_CHANNEL_ID` | (from .env.local) |
| `LINE_LOGIN_CHANNEL_SECRET` | (from .env.local) |
| `LINE_LOGIN_SCOPE` | `profile openid` |
| `LINE_OA_BASIC_ID` | `@480lqmnf` |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | (from .env.local) |
| `LINE_MESSAGING_CHANNEL_SECRET` | (from .env.local) |
| `SESSION_SECRET` | (from .env.local) |
| `SUPABASE_URL` | (from .env.local) |
| `SUPABASE_SERVICE_ROLE_KEY` | (from .env.local) |
| `DATABASE_URL` | (from .env.local — the 6543 pooler URL) |
| `DIRECT_URL` | (from .env.local — the 5432 URL) |
| `LINE_LOGIN_CALLBACK_URL` | `https://PLACEHOLDER/api/auth/line/callback` (fix in step 4) |
| `APP_BASE_URL` | `https://PLACEHOLDER` (fix in step 4) |
| `BUSINESS_BANK_ACCOUNTS` | (from .env.local — your receiving accounts shown in the LINE messages) |
| `EASYSLIP_API_KEY` | (from .env.local — developer.easyslip.com → Applications) |
| `CRON_SECRET` | (from .env.local — Vercel auto-sends it as `Authorization: Bearer $CRON_SECRET` on the cron route) |

4. Click **Deploy** and wait for it to finish. You'll get a URL like `https://ticketify-xxxx.vercel.app`.

## 3. Point the URLs at production
Now that you know the real URL (e.g. `https://ticketify-xxxx.vercel.app`):
1. In Vercel → Project → **Settings → Environment Variables**, update:
   - `APP_BASE_URL` = `https://ticketify-xxxx.vercel.app`
   - `LINE_LOGIN_CALLBACK_URL` = `https://ticketify-xxxx.vercel.app/api/auth/line/callback`
2. **Redeploy** (Deployments → ⋯ → Redeploy) so the new values take effect.

## 4. Add the production callback to LINE
In the LINE Developers Console → your **LINE Login** channel → **LINE Login** tab → **Callback URL**, add a new line:
```
https://ticketify-xxxx.vercel.app/api/auth/line/callback
```
(Keep the localhost one too.) Save.

## 5. Wire up Phase 4 webhooks
Now that the site is live at its real URL:
1. **LINE Messaging API** → LINE Developers Console → your Messaging API channel →
   Messaging API tab → Webhook URL → set to
   `https://ticketify-xxxx.vercel.app/api/line/webhook` → toggle "Use webhook" on →
   click **Verify** to confirm LINE can reach it. This is the only webhook needed now —
   there's no payment gateway to configure (see the Phase 4.2 note in README.md).
2. Vercel Cron (daily installment reminders) is already configured via `vercel.json` —
   just make sure `CRON_SECRET` is set in the project's environment variables (step 3 above).
   Check **Deployments → Cron Jobs** in the Vercel dashboard to confirm it registered.

## Done
Open `https://ticketify-xxxx.vercel.app`, log in with LINE, and test. Friends land on the dashboard; admins (role=ADMIN) see Manage Concerts.

### Notes
- Same Supabase database is used in production and locally — they share data.
- Poster uploads work (Supabase Storage, public bucket, service-role key server-side).
- This is a **test** deploy: build-time lint/type checks are disabled in `next.config.mjs`. Re-enable them for a production-quality build.
- Rotate the Supabase service-role key before real production (it was shown in chat).
