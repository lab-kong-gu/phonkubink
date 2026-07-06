import Link from "next/link";
import AdminShell from "../_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import {
  orderStatusLabel,
  nextActionLabel,
  isActive,
  isAwaitingDocsReview,
  isDocsRejected,
} from "@/lib/orderStatus";
import { IconSearch } from "../../_components/icons";
import { advanceOrder, cancelOrderAdmin, approveDocsOrder, rejectDocsOrder, resubmitDocsOrder } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: { concert?: string; q?: string };
}) {
  const concertId = searchParams.concert;
  const q = (searchParams.q ?? "").trim();

  const ci = { contains: q, mode: "insensitive" as const };
  const where = {
    ...(concertId ? { concertId } : {}),
    ...(q
      ? {
          OR: [
            { customerName: ci }, // full name from checkout
            { user: { displayName: ci } }, // LINE display name
            { customerPhone: { contains: q } }, // phone
          ],
        }
      : {}),
  };

  const [orders, concert] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true, concert: true },
    }),
    concertId ? prisma.concert.findUnique({ where: { id: concertId } }) : Promise.resolve(null),
  ]);

  return (
    <AdminShell active="orders">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">ออเดอร์</h1>
          <p className="text-sm text-slate-500">
            {concert ? `กรองเฉพาะ: ${concert.name}` : "จัดการสถานะการจองของลูกค้า"}
          </p>
        </div>
        {concert ? (
          <Link href="/admin/orders" className="text-sm text-brand-pink hover:underline">
            แสดงทั้งหมด
          </Link>
        ) : null}
      </div>

      {/* Search by customer LINE name */}
      <form method="GET" className="mb-4 flex gap-2">
        {concertId ? <input type="hidden" name="concert" value={concertId} /> : null}
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหาชื่อลูกค้า / LINE / เบอร์โทร…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-pink focus:outline-none"
          />
        </div>
        <button className="rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          ค้นหา
        </button>
        {q ? (
          <Link
            href={concertId ? `/admin/orders?concert=${concertId}` : "/admin/orders"}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ล้าง
          </Link>
        ) : null}
      </form>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          ยังไม่มีออเดอร์
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">ลูกค้า</th>
                <th className="px-4 py-3 font-semibold">คอนเสิร์ต · โซน</th>
                <th className="px-4 py-3 font-semibold">วันที่</th>
                <th className="px-4 py-3 text-right font-semibold">ยอดรวม</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
                <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const st = orderStatusLabel(o.status);
                const advanceLabel = nextActionLabel(o.status);
                return (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FCE7F1] text-xs font-semibold text-brand-pink">
                          {(o.customerName ?? o.user.displayName ?? "?").charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-brand-navy">
                            {o.customerName ?? o.user.displayName ?? "ผู้ใช้"}
                          </p>
                          <p className="text-xs text-slate-400">LINE: {o.user.displayName ?? "—"}</p>
                          {o.customerPhone ? (
                            <p className="text-xs text-slate-400">โทร {o.customerPhone}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.concert.name}
                      <span className="text-slate-400"> · {o.tierName}</span>
                      {o.ticketMethod ? (
                        <p className="mt-1 text-xs text-slate-400">กดบัตร: {o.ticketMethod}</p>
                      ) : null}
                      {o.paymentMethods.length > 0 ? (
                        <p className="text-xs text-slate-400">ชำระ: {o.paymentMethods.join(", ")}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-navy">{baht(o.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                      {isDocsRejected(o.status) && o.docsRejectionReason ? (
                        <p className="mt-1 max-w-[220px] text-xs text-rose-500">{o.docsRejectionReason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isAwaitingDocsReview(o.status) ? (
                          <>
                            <form action={approveDocsOrder}>
                              <input type="hidden" name="id" value={o.id} />
                              <button className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                                เอกสารผ่าน
                              </button>
                            </form>
                            <details className="relative">
                              <summary className="cursor-pointer list-none rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
                                เอกสารไม่ผ่าน
                              </summary>
                              <form
                                action={rejectDocsOrder}
                                className="absolute right-0 z-10 mt-2 w-64 space-y-2 rounded-lg border border-rose-200 bg-white p-3 shadow-lg"
                              >
                                <input type="hidden" name="id" value={o.id} />
                                <label className="block text-xs font-medium text-brand-navy">
                                  เหตุผล / เอกสารที่ต้องแก้ไข
                                </label>
                                <textarea
                                  name="reason"
                                  required
                                  rows={3}
                                  placeholder="เช่น รูปบัตรประชาชนไม่ชัด กรุณาถ่ายใหม่"
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-rose-400 focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                                >
                                  ยืนยันเอกสารไม่ผ่าน
                                </button>
                              </form>
                            </details>
                          </>
                        ) : isDocsRejected(o.status) ? (
                          <form action={resubmitDocsOrder}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                              ลูกค้าส่งเอกสารใหม่แล้ว
                            </button>
                          </form>
                        ) : isActive(o.status) && advanceLabel ? (
                          <form action={advanceOrder}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="rounded-lg bg-brand-pink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                              {advanceLabel}
                            </button>
                          </form>
                        ) : null}
                        {isActive(o.status) ? (
                          <form action={cancelOrderAdmin}>
                            <input type="hidden" name="id" value={o.id} />
                            <button className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">
                              ยกเลิก
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
