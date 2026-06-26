import Link from "next/link";
import AdminShell from "../_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { IconClipboard, IconEdit } from "../../_components/icons";

export const dynamic = "force-dynamic";

const badge: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-500",
  PUBLISHED: "bg-green-100 text-green-700",
  SOLD_OUT: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default async function AdminConcerts() {
  const concerts = await prisma.concert.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tiers: true, orders: true } } },
  });

  return (
    <AdminShell active="concerts">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">จัดการคอนเสิร์ต</h1>
          <p className="text-sm text-slate-500">เพิ่ม แก้ไข โซน/ราคา และแผนผ่อน</p>
        </div>
        <Link
          href="/admin/concerts/new"
          className="rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + เพิ่มคอนเสิร์ต
        </Link>
      </div>

      {concerts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          ยังไม่มีคอนเสิร์ต — กด “เพิ่มคอนเสิร์ต” เพื่อเริ่ม
        </p>
      ) : (
        <ul className="space-y-3">
          {concerts.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-navy">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.artist ?? "—"} · {c._count.tiers} โซน · {c._count.orders} ออเดอร์
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    badge[c.status] ?? "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/admin/orders?concert=${c.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#FCE7F1] px-3 py-2 text-xs font-semibold text-brand-pink hover:opacity-90"
                >
                  <IconClipboard className="h-4 w-4" /> ดูออเดอร์ ({c._count.orders})
                </Link>
                <Link
                  href={`/admin/concerts/${c.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-brand-navy hover:bg-slate-50"
                >
                  <IconEdit className="h-4 w-4" /> แก้ไข
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
