import Link from "next/link";
import AppShell from "../_components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { fmtDate, fmtTime, daysUntil } from "@/lib/format";
import { IconSearch, IconPin, IconCalendar, IconArrowRight, IconChevronRight } from "../_components/icons";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const [concerts, orders] = await Promise.all([
    prisma.concert.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      take: 8,
      include: { tiers: { where: { isActive: true }, select: { price: true } } },
    }),
    prisma.order.findMany({ where: { lineUserId: user.lineUserId }, include: { concert: true } }),
  ]);

  const popular = concerts.slice(0, 4);
  const upcoming = concerts.slice(0, 3);
  const total = orders.length;
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
  const completed = orders.filter((o) => o.status === "COMPLETED").length;
  const upcomingTickets = total - cancelled - completed;

  return (
    <AppShell active="dashboard">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-brand-navy via-purple-700 to-brand-pink p-8 text-white">
        <p className="text-lg">👋 ยินดีต้อนรับกลับมา</p>
        <h1 className="text-4xl font-extrabold">{user.displayName ?? "เพื่อน"}!</h1>
        <p className="mt-1 max-w-sm text-sm text-white/80">
          เลือกคอนเสิร์ตที่อยากดู แล้วผ่อนสบาย ๆ กับเรา
        </p>
        <div className="mt-5 flex max-w-xl items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-500">
          <IconSearch className="h-5 w-5" />
          <span className="text-sm">ค้นหาคอนเสิร์ต ศิลปิน สถานที่…</span>
        </div>
      </section>

      {/* Popular Concerts */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy">คอนเสิร์ตยอดนิยม</h2>
          <Link href="/concerts" className="flex items-center gap-1 text-sm text-brand-pink hover:underline">
            ดูทั้งหมด <IconChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {popular.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            ยังไม่มีคอนเสิร์ตที่เปิดขาย
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((c) => (
              <Link
                key={c.id}
                href={`/concerts/${c.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md"
              >
                {c.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.posterUrl} alt={c.name} className="h-36 w-full object-cover" />
                ) : (
                  <div className="h-36 w-full bg-gradient-to-br from-brand-pink/30 to-brand-navy/30" />
                )}
                <div className="p-4">
                  <p className="line-clamp-2 font-semibold text-brand-navy">{c.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <IconPin className="h-3.5 w-3.5" /> {c.venue ?? "—"}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <IconCalendar className="h-3.5 w-3.5" /> {fmtDate(c.eventDate)} · {fmtTime(c.eventDate)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-pink">
                      เริ่มต้น {baht(c.tiers.length ? Math.min(...c.tiers.map((t) => Number(t.price))) : 0)}
                    </span>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FCE7F1] text-brand-pink group-hover:bg-brand-pink group-hover:text-white">
                      <IconArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming + My Tickets */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-[#FCE7F1]/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-brand-navy">คอนเสิร์ตที่กำลังจะมาถึง</h3>
            <Link href="/concerts" className="text-xs text-brand-pink hover:underline">ดูทั้งหมด</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มี</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <Link href={`/concerts/${c.id}`} className="flex items-center gap-3">
                    {c.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.posterUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-brand-pink/20" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-navy">{c.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {c.venue ?? "—"} · {fmtDate(c.eventDate)}
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-pink">
                      {daysUntil(c.eventDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-[#FCE7F1]/60 p-5">
          <h3 className="mb-3 font-bold text-brand-navy">ตั๋วของฉัน</h3>
          <div className="flex items-center justify-between rounded-xl bg-white p-4">
            <div>
              <p className="text-3xl font-extrabold text-brand-navy">{total}</p>
              <p className="text-xs text-slate-500">การจองทั้งหมด</p>
            </div>
            <Link
              href="/tickets"
              className="flex items-center gap-1 rounded-lg border border-brand-pink px-3 py-2 text-sm text-brand-pink hover:bg-[#FCE7F1]"
            >
              ดูประวัติการจอง <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white p-3">
              <p className="text-2xl font-bold text-brand-navy">{upcomingTickets}</p>
              <p className="text-xs text-slate-500">กำลังดำเนินการ</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-2xl font-bold text-brand-navy">{completed}</p>
              <p className="text-xs text-slate-500">สำเร็จแล้ว</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-2xl font-bold text-brand-navy">{cancelled}</p>
              <p className="text-xs text-slate-500">ยกเลิก</p>
            </div>
          </div>
        </div>
      </section>

      {user.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          ⚙️ จัดการคอนเสิร์ต (ผู้ดูแลระบบ)
        </Link>
      ) : null}
    </AppShell>
  );
}
