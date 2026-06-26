import Link from "next/link";
import AdminShell from "./_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { orderStatusLabel, isIssued, isCancelled, isActive } from "@/lib/orderStatus";
import { IconArrowRight } from "../_components/icons";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [concerts, orders] = await Promise.all([
    prisma.concert.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, concert: true },
    }),
  ]);

  const published = concerts.filter((c) => c.status === "PUBLISHED").length;
  const draft = concerts.filter((c) => c.status === "DRAFT").length;

  const issued = orders.filter((o) => isIssued(o.status)).length;
  const cancelled = orders.filter((o) => isCancelled(o.status)).length;
  const inProgress = orders.filter((o) => isActive(o.status)).length;
  const revenue = orders
    .filter((o) => !isCancelled(o.status))
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const recent = orders.slice(0, 5);

  const cards = [
    { label: "คอนเสิร์ตทั้งหมด", value: concerts.length, sub: `เผยแพร่ ${published} · ฉบับร่าง ${draft}` },
    { label: "ออเดอร์ทั้งหมด", value: orders.length, sub: `กำลังดำเนินการ ${inProgress}` },
    { label: "ออกบัตรแล้ว", value: issued, sub: `ยกเลิก ${cancelled}` },
    { label: "รายได้รวม", value: baht(revenue), sub: `จาก ${orders.length} ออเดอร์` },
  ];

  return (
    <AdminShell active="overview">
      <h1 className="text-3xl font-extrabold text-brand-navy">ภาพรวม</h1>
      <p className="mt-1 text-sm text-slate-500">สรุปยอดขายและสถานะการจองของคอนเสิร์ตทั้งหมด</p>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-400">{c.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-brand-navy">{c.value}</p>
            <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-brand-navy">ออเดอร์ล่าสุด</h2>
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-brand-pink hover:underline">
              ดูทั้งหมด <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีออเดอร์</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((o) => {
                const st = orderStatusLabel(o.status);
                return (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FCE7F1] text-sm font-semibold text-brand-pink">
                      {(o.customerName ?? o.user.displayName ?? "?").charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-navy">
                        {o.customerName ?? o.user.displayName ?? "ผู้ใช้"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {o.concert.name} · {o.tierName}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-brand-navy">
                      {baht(o.totalAmount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Booking status per concert */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-brand-navy">สถานะการจอง</h2>
          {concerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีคอนเสิร์ต</p>
          ) : (
            <ul className="space-y-4">
              {concerts.map((c) => (
                <li key={c.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-navy">{c.name}</p>
                      <p className="text-xs text-slate-400">{c._count.orders} ออเดอร์</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        c.status === "PUBLISHED"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status === "PUBLISHED" ? "เปิดจอง" : "ปิดจอง"}
                    </span>
                  </div>
                  <Link
                    href={`/admin/orders?concert=${c.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-brand-pink hover:underline"
                  >
                    ดูออเดอร์ <IconArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
