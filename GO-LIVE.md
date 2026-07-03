# Go-Live Checklist — ผ่อนกับอิ้ง (Ticketify)

The app is code-complete for Phase 4.2 (manual PromptPay transfer + LINE slip
verification via EasySlip). Everything below is the remaining **user-side** work
to take it live — none of it can be done from a Claude session (secrets, KYC,
your own database, and your own Vercel/LINE accounts).

Work top to bottom. Each box is a real blocker until it's checked.

---

## 1. Fill your receiving accounts — `.env.local`
One env var, `BUSINESS_BANK_ACCOUNTS`, holds all the accounts you want customers to
transfer to (you can list several — different banks / PromptPay):

- [ ] `BUSINESS_BANK_ACCOUNTS` — one account per line, each as
      `Bank | Account number | Holder name` (holder optional). Separate accounts with a
      newline or `;`. Example:
      `ไทยพาณิชย์ | 123-4-56789-0 | อิ้ง; กสิกรไทย | 987-6-54321-0 | อิ้ง; พร้อมเพย์ | 081-234-5678`

> There's no web pay page or QR anymore. These accounts are shown as **text rows inside
> the LINE invoice / reminder messages** so the customer can pick one, transfer manually,
> and send a slip photo back in chat. If it's left blank the messages simply omit the
> account rows (no crash) — but then customers have no way to know where to send money
> except whatever you tell them in chat, so fill it in.
> `EASYSLIP_API_KEY` and everything else are already set.

## 2. Sync the database (run locally, once)
The schema has changes the deployed client needs (`SlipSubmission` model, the
`gatewayChargeId` rename, partial-payment fields). The generated Prisma client is
currently stale — this is the source of every remaining TypeScript error, and both
clear the moment you run:

```bash
npm run db:push
npm run db:generate
```

- [ ] `db:push` succeeded (schema synced to Supabase)
- [ ] `db:generate` succeeded (TS errors about `slipSubmission` / `gatewayChargeId` gone)

> These must run on your own machine — this sandbox can't reach `binaries.prisma.sh`,
> so it can't generate the client or verify the DB.

## 3. Verify locally
- [ ] `npm run dev`, open http://localhost:3000, log in with LINE
- [ ] Create a test order → confirm the LINE invoice message arrives with your
      PromptPay account details shown as text rows
- [ ] (Optional) send a slip photo in LINE chat and confirm it either auto-confirms
      or lands in `/admin/slips`

## 4. Push to GitHub & deploy to Vercel
Follow `DEPLOY.md` (already written) — the short version:

- [ ] Delete the stray `poster.png` test file if you want (optional)
- [ ] `git add . && git commit && git push` to a new empty GitHub repo
- [ ] Import the repo into Vercel (Next.js auto-detected)
- [ ] Add **every** env var from `.env.local` into Vercel → Project → Environment
      Variables (see the table in `DEPLOY.md` §2 — includes the two new ones from step 1)
- [ ] Deploy, note the real URL (e.g. `https://ticketify-xxxx.vercel.app`)

## 5. Point URLs at production & wire the LINE webhook
- [ ] In Vercel, set `APP_BASE_URL` and `LINE_LOGIN_CALLBACK_URL` to the real URL, redeploy
- [ ] Add the production callback URL in the LINE Login channel (keep localhost too)
- [ ] LINE Messaging API channel → Webhook URL → `https://<your-url>/api/line/webhook`
      → toggle "Use webhook" on → click **Verify**. This is the only webhook needed now.
- [ ] Confirm `CRON_SECRET` is set in Vercel, and check Deployments → Cron Jobs that the
      daily reminder job registered.

---

## What was just done (dev-side, complete)
- Removed the dead payment code the old gateway phases left behind:
  `src/lib/omise.ts`, `src/lib/beam.ts`, and the 5 stub routes under
  `src/app/api/payments/`.
- Updated the now-misleading gateway comments in `prisma/schema.prisma`.
- **Removed the web pay page + QR entirely.** Deleted `src/app/pay/**`, the
  `/api/payments/status` polling route, and `src/lib/promptpayQr.ts`; uninstalled the
  `promptpay-qr` / `qrcode` packages. Payment now happens purely over LINE: the invoice /
  plan-updated / reminder messages carry the PromptPay account details as text, the
  customer transfers manually and sends a slip photo, and EasySlip verification + the
  `/admin/slips` queue confirm it (unchanged). Order-creation flows now redirect to
  `/tickets` instead of a pay page.
- Verified these changes introduced **zero** new errors. All remaining TypeScript errors
  are the stale-client ones cleared by step 2.
