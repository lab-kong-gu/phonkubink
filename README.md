# Ticketify · ผ่อนกับอิ้ง

ซื้อบัตรคอนเสิร์ตแบบผ่อนชำระ — เว็บไซต์ + LINE Official Account ใช้ฐานข้อมูลเดียวกัน เชื่อมด้วย LINE `userId`.

Stack: **Next.js (App Router) + TypeScript + Tailwind + Prisma + Supabase (Postgres)**.

---

## Get it running (first time)

### 1. Install dependencies
```bash
npm install
```

### 2. Create your Supabase database
1. Go to https://supabase.com → create a free project (pick a region near Thailand, e.g. Singapore).
2. Wait for it to finish provisioning.
3. Open **Project Settings → Database → Connection string**.
4. Copy two strings into `.env.local`:
   - **DATABASE_URL** — the *Transaction pooler* string (port `6543`). Add `?pgbouncer=true` at the end.
   - **DIRECT_URL** — the *direct* connection string (port `5432`). Used by migrations.

`.env.local` already has your LINE credentials filled in from Phase 0.

### 3. Create the tables
```bash
npm run db:push      # pushes the Prisma schema to Supabase (no migration files)
npm run db:generate  # generates the typed Prisma client
```
> Use `npm run db:push` while prototyping. Switch to `npm run db:migrate` (versioned migrations) once the schema settles.

### 4. Run the dev server
```bash
npm run dev
```
Open http://localhost:3000 — you'll see the **setup status** page confirming every credential is wired.

### 5. (optional) Browse your data
```bash
npm run db:studio    # opens Prisma Studio — a UI for your tables
```
Or use the Supabase **Table Editor** in the dashboard.

---

## Project structure
```
prisma/
  schema.prisma        # User / Order / Installment models
src/
  app/
    layout.tsx
    page.tsx           # setup-status page (Phase 1)
    globals.css
  lib/
    prisma.ts          # shared Prisma client
.env.local             # secrets (gitignored)
.env.local.example     # template (committed)
PHASE-0-LINE-SETUP.md  # LINE console setup notes
```

## Data model (the ผ่อน core)
- **User** — keyed by `lineUserId`. One row per LINE user.
- **Order** — a ticket purchase + chosen installment plan.
- **Installment** — each due amount under an order: the down payment (week 0) plus every
  weekly งวด (due date, amount, status, gateway charge id, reminder timestamp).

Money is stored in **baht** as `Decimal(10,2)` — exact to 2 decimal places, so installment splits (e.g. ฿1,250 ÷ 8 = ฿156.25) stay precise with no floating-point rounding.

## Useful scripts
| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run db:push` | Sync schema → Supabase |
| `npm run db:migrate` | Create a versioned migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Regenerate the Prisma client |

## Roadmap
- **Phase 0** ✅ LINE provider + Login channel + Messaging API + OA linked
- **Phase 1** ✅ Next.js skeleton + DB schema
- **Phase 2** ✅ LINE Login flow + friendship gate (prints your `userId`)
- **Phase 3** ✅ wire up the designed UI (ticket history, profile, installment purchase)
- **Phase 4** ✅ Messaging API push (bills/receipts) + payment gateways + webhooks
- **Phase 4.1** ✅ split payment gateways: PromptPay moved to Beam (free fee), cards stay on Omise
- **Phase 4.2** ✅ dropped payment gateways entirely — manual PromptPay transfer + LINE slip verification (EasySlip)
- **Phase 4.3** ✅ removed the web pay page + QR — account details now shown as text inside the LINE messages; payment is fully chat-driven

## Phase 4.2 — payments, no gateway
No payment gateway is used anymore (Omise and Beam were both removed — see
`phase4-payments-architecture` project memory for the full history). Instead:
- **Pay flow**: every order gets a down-payment `Installment` (week 0, `isDownPayment`).
  There is **no web pay page** — on order creation (and on reminders) a LINE message is
  pushed showing the amount owed plus your **receiving accounts as text** (one or more
  banks / PromptPay, from `BUSINESS_BANK_ACCOUNTS`, via `accountRows()` in
  `src/lib/linePush.ts`). The customer transfers manually in their own banking app, then
  **sends a photo of the slip in LINE chat**. The ฿300 booking deposit works the same way.
- **Slip verification**: image messages are handled in `/api/line/webhook`
  (`src/app/api/line/webhook/route.ts`) — downloads the photo from LINE's Content API,
  uploads it to a private Supabase Storage bucket for audit, finds the customer's one
  unambiguous open installment, and verifies the slip via **EasySlip**
  (`src/lib/easyslip.ts`, reads the QR embedded in the slip and checks it against real
  bank data). If the amount matches and it isn't a reused slip, the payment is
  auto-confirmed (`markInstallmentPaidAndNotify` in `src/lib/paymentConfirm.ts`) and a
  receipt is pushed — same as the old gateway-confirmed flow. Anything ambiguous
  (multiple open installments, amount mismatch, duplicate slip, unreadable image) creates
  a `SlipSubmission` row and lands in the admin review queue at **`/admin/slips`**, where
  an admin picks the installment/amount and confirms or rejects it by hand.
- **Push messages** (`src/lib/linePush.ts`): invoice on order creation, receipt on
  payment, reminder ~2 days before due, ticket-issued receipt when admin issues the ticket.
- **Webhooks**: only `/api/line/webhook` (LINE events, HMAC-verified) is needed —
  it keeps `User.isFriend` in sync, auto-replies to text messages, and now also handles
  the slip-photo flow above.
- **Reminders**: `/api/cron/reminders`, run daily via Vercel Cron (`vercel.json`),
  protected by `CRON_SECRET`.
- Setup: fill in `BUSINESS_BANK_ACCOUNTS` (your receiving accounts, one per line)
  and `EASYSLIP_API_KEY` (sign up at developer.easyslip.com — business KYC required) in
  `.env.local`, run `npm run db:push && npm run db:generate`, then see `DEPLOY.md` §5 for
  the (now much shorter) webhook setup once deployed.

## How login works (Phase 2)
1. `/api/auth/line/login` → redirects to LINE (with `bot_prompt=aggressive` to prompt the add-friend).
2. LINE redirects back to `/api/auth/line/callback` → exchanges the code, fetches the
   profile + friendship status, upserts the `User`, and sets a signed session cookie.
3. Friends land on `/dashboard` (shows your `userId`); non-friends land on `/add-friend`.
4. `/api/auth/logout` clears the session.

To test: `npm run dev`, open http://localhost:3000, click **เข้าสู่ระบบด้วย LINE**.
