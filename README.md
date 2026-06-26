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
- **Installment** — each weekly งวด under an order (due date, amount, status).

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
- **Phase 3** — wire up the designed UI (ticket history, profile, installment purchase)
- **Phase 4** — Messaging API push (bills/receipts) + payment gateway + webhooks

## How login works (Phase 2)
1. `/api/auth/line/login` → redirects to LINE (with `bot_prompt=aggressive` to prompt the add-friend).
2. LINE redirects back to `/api/auth/line/callback` → exchanges the code, fetches the
   profile + friendship status, upserts the `User`, and sets a signed session cookie.
3. Friends land on `/dashboard` (shows your `userId`); non-friends land on `/add-friend`.
4. `/api/auth/logout` clears the session.

To test: `npm run dev`, open http://localhost:3000, click **เข้าสู่ระบบด้วย LINE**.
