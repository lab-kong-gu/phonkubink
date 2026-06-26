// Home / landing page. Server Component, so it can read process.env and the session.
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const checks = [
  { label: "LINE Login Channel ID", ok: !!process.env.LINE_LOGIN_CHANNEL_ID },
  { label: "LINE Login Channel Secret", ok: !!process.env.LINE_LOGIN_CHANNEL_SECRET },
  { label: "LINE Messaging Access Token", ok: !!process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN },
  { label: "LINE Messaging Channel Secret", ok: !!process.env.LINE_MESSAGING_CHANNEL_SECRET },
  { label: "Session Secret", ok: !!process.env.SESSION_SECRET },
  { label: "Database URL", ok: !!process.env.DATABASE_URL },
];

export default function Home() {
  const loggedIn = !!getSessionUserId();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">
          Ticketify · <span className="text-brand-pink">ผ่อนกับอิ้ง</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">ซื้อบัตรคอนเสิร์ตแบบผ่อนชำระ ผ่าน LINE</p>
      </div>

      {loggedIn ? (
        <a
          href="/dashboard"
          className="w-fit rounded-lg bg-brand-pink px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          ไปที่แดชบอร์ด →
        </a>
      ) : (
        <a
          href="/api/auth/line/login"
          className="flex w-fit items-center gap-2 rounded-lg bg-[#06C755] px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          เข้าสู่ระบบด้วย LINE
        </a>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Setup status
        </h2>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between text-sm">
              <span className="text-brand-navy">{c.label}</span>
              <span className={c.ok ? "font-semibold text-green-600" : "font-semibold text-slate-300"}>
                {c.ok ? "✓ set" : "— missing"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
