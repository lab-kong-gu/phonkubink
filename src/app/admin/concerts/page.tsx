import Link from "next/link";
import AdminShell from "../_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/format";
import { IconClipboard, IconEdit } from "../../_components/icons";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-500",
  PUBLISHED: "bg-green-100 text-green-700",
  SOLD_OUT: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default async function AdminConcerts() {
  const concerts = await prisma.concert.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tiers: true, orders: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { installments: { select: { amountPaid: true } } },
      },
    },
  });

  return (
    <AdminShell active="concerts">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">จัดการคอนเสิร์ต</h1>
          <p className="mt-1 text-sm text-slate-500">เพิ่ม แก้ไข และเปิด/ปิดการจองของแต่ละคอนเสิร์ต</p>
        </div>
        <Link
          href="/admin/concerts/new"
          className="shrink-0 rounded-xl bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          + เพิ่มคอนเสิร์ต
        </Link>
      </div>

      {concerts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          ยังไม่มีคอนเสิร์ต — กด “เพิ่มคอนเสิร์ต” เพื่อเริ่ม
        </p>
      ) : (
        <div className="space-y-4">
          {concerts.map((c) => {
            const revenue = c.orders.reduce(
              (s, o) => s + o.installments.reduce((t, i) => t + parseFloat(String(i.amountPaid)), 0),
              0
            );
            const isOpen = c.status === "PUBLISHED";
            return (
              <div
                key={c.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {c.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.posterUrl}
                    alt=""
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-[#FCE7F1] text-xs text-brand-pink/70">
                    poster
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-brand-navy">{c.name}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        statusBadge[c.status] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isOpen ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isOpen ? "เปิดจอง" : "ปิดจอง"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {[c.artist, c.venue, c.eventDate ? fmtDate(c.eventDate) : null, c.eventDate ? fmtTime(c.eventDate) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-brand-navy">
                    <span className="text-slate-400">โซน</span> {c._count.tiers}
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="text-slate-400">ออเดอร์</span> {c._count.orders}
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="text-slate-400">รายได้</span> <span className="text-brand-pink">{baht(revenue)}</span>
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <Link
                    href={`/admin/orders?concert=${c.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-pink/40 px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-[#FCE7F1]/50"
                  >
                    <IconClipboard className="h-4 w-4" /> ดูออเดอร์
                  </Link>
                  <Link
                    href={`/admin/concerts/${c.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#FCE7F1] px-4 py-2 text-sm font-medium text-brand-pink hover:opacity-90"
                  >
                    <IconEdit className="h-4 w-4" /> แก้ไข
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
