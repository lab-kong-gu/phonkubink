import Link from "next/link";
import AppShell from "../_components/AppShell";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/format";
import { IconPin, IconCalendar, IconArrowRight } from "../_components/icons";

export const dynamic = "force-dynamic";

export default async function Concerts() {
  const concerts = await prisma.concert.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { eventDate: "asc" },
    include: {
      tiers: { where: { isActive: true }, select: { price: true } },
      _count: { select: { tiers: true } },
    },
  });

  return (
    <AppShell active="concerts">
      <h1 className="text-3xl font-extrabold text-brand-navy">Concerts</h1>
      <p className="mt-1 text-sm text-slate-500">เลือกคอนเสิร์ตที่อยากไป แล้วผ่อนสบาย ๆ</p>

      {concerts.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          ยังไม่มีคอนเสิร์ตที่เปิดขายตอนนี้
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {concerts.map((c) => (
            <Link
              key={c.id}
              href={`/concerts/${c.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md"
            >
              {c.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.posterUrl} alt={c.name} className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 w-full bg-gradient-to-br from-brand-pink/30 to-brand-navy/30" />
              )}
              <div className="p-4">
                <p className="font-semibold text-brand-navy">{c.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <IconPin className="h-3.5 w-3.5" /> {c.venue ?? "—"}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <IconCalendar className="h-3.5 w-3.5" /> {fmtDate(c.eventDate)} · {fmtTime(c.eventDate)}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-pink">
                    From {baht(c.tiers.length ? Math.min(...c.tiers.map((t) => Number(t.price))) : 0)} ·{" "}
                    {c._count.tiers} โซน
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
    </AppShell>
  );
}
