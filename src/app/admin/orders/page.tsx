import Link from "next/link";
import AdminShell from "../_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { baht, remainingAmount } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  orderStatusLabel,
  orderTimeline,
  nextActionLabel,
  isActive,
  isIssued,
  isCancelled,
  isAwaitingDocsReview,
  isDocsRejected,
} from "@/lib/orderStatus";
import { IconSearch } from "../../_components/icons";
import { advanceOrder, cancelOrderAdmin, approveDocsOrder, rejectDocsOrder, resubmitDocsOrder } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: { concert?: string; q?: string; status?: string };
}) {
  const concertId = searchParams.concert;
  const q = (searchParams.q ?? "").trim();
  const tab = searchParams.status ?? "all"; // all | active | issued | cancelled

  const ci = { contains: q, mode: "insensitive" as const };
  const where = {
    ...(concertId ? { concertId } : {}),
    ...(q
      ? {
          OR: [
            { customerName: ci },
            { user: { displayName: ci } },
            { customerPhone: { contains: q } },
          ],
        }
      : {}),
  };

  const [allOrders, concert] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true, concert: true, installments: true },
    }),
    concertId ? prisma.concert.findUnique({ where: { id: concertId } }) : Promise.resolve(null),
  ]);

  // Stats over the full (concert + search) set
  const total = allOrders.length;
  const issuedCount = allOrders.filter((o) => isIssued(o.status)).length;
  const activeCount = allOrders.filter((o) => isActive(o.status)).length;
  const cancelledCount = allOrders.filter((o) => isCancelled(o.status)).length;
  const revenue = allOrders
    .filter((o) => !isCancelled(o.status))
    .reduce((s, o) => s + o.installments.reduce((t, i) => t + parseFloat(String(i.amountPaid)), 0), 0);

  const orders = allOrders.filter((o) =>
    tab === "active" ? isActive(o.status) : tab === "issued" ? isIssued(o.status) : tab === "cancelled" ? isCancelled(o.status) : true
  );

  const q0 = concertId ? `concert=${concertId}` : "";
  const tabHref = (t: string) => `/admin/orders?${[q0, t === "all" ? "" : `status=${t}`, q ? `q=${encodeURIComponent(q)}` : ""].filter(Boolean).join("&")}`;
  const tabs: { key: string; label: string; n: number }[] = [
    { key: "all", label: "ทั้งหมด", n: total },
    { key: "active", label: "กำลังดำเนินการ", n: activeCount },
    { key: "issued", label: "ออกบัตรแล้ว", n: issuedCount },
    { key: "cancelled", label: "ยกเลิก", n: cancelledCount },
  ];

  return (
    <AdminShell active="orders">
      {concert ? (
        <>
          <Link href="/admin/concerts" className="text-sm text-slate-400 hover:text-brand-pink">
            ← จัดการคอนเสิร์ต
          </Link>
          <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-brand-navy">{concert.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    concert.status === "PUBLISHED" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {concert.status === "PUBLISHED" ? "เปิดจอง" : "ปิดจอง"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {[concert.artist, concert.venue, concert.eventDate ? fmtDate(concert.eventDate) : null, concert.eventDate ? fmtTime(concert.eventDate) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Link
              href={`/admin/concerts/${concert.id}`}
              className="shrink-0 rounded-xl bg-[#FCE7F1] px-4 py-2 text-sm font-medium text-brand-pink hover:opacity-90"
            >
              จัดการ / เปิด-ปิดจอง
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "ออเดอร์ทั้งหมด", value: String(total), cls: "text-brand-navy" },
              { label: "ออกบัตรแล้ว", value: String(issuedCount), cls: "text-green-600" },
              { label: "กำลังดำเนินการ", value: String(activeCount), cls: "text-violet-600" },
              { label: "ยกเลิก", value: String(cancelledCount), cls: "text-rose-500" },
              { label: "รายได้", value: baht(revenue), cls: "text-brand-pink" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                  tab === t.key ? "bg-brand-pink text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-xs ${tab === t.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{t.n}</span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-navy">ออเดอร์</h1>
          <p className="mt-1 text-sm text-slate-500">จัดการสถานะการจองของลูกค้าทุกคอนเสิร์ต</p>
        </div>
      )}

      {/* Search */}
      <form method="GET" className="mb-4 flex gap-2">
        {concertId ? <input type="hidden" name="concert" value={concertId} /> : null}
        {tab !== "all" ? <input type="hidden" name="status" value={tab} /> : null}
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหาชื่อลูกค้า / LINE / เบอร์โทร…"
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-pink focus:outline-none"
          />
        </div>
        <button className="rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">ค้นหา</button>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">ยังไม่มีออเดอร์</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const name = o.customerName ?? o.user.displayName ?? "ผู้ใช้";
            const st = orderStatusLabel(o.status);
            const tl = orderTimeline(o.status);
            const paidInst = o.installments.filter((i) => i.status === "PAID").length;
            const totalInst = o.installments.length;
            const paidAmount = o.installments.reduce((t, i) => t + parseFloat(String(i.amountPaid)), 0);
            const remaining = o.installments.reduce((t, i) => t + remainingAmount(i.amount, i.amountPaid), 0);
            const advanceLabel = nextActionLabel(o.status);
            return (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {/* header: big name + phone + methods */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FCE7F1] text-base font-bold text-brand-pink">
                      {name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-brand-navy">{name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {[o.customerPhone, o.user.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                </div>

                {/* prominent method pills */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-[#FCE7F1] px-3 py-1.5 font-medium text-brand-pink">
                    วิธีกดบัตร: {o.ticketMethod ?? "—"}
                  </span>
                  <span className="rounded-lg bg-sky-50 px-3 py-1.5 font-medium text-sky-700">
                    วิธีชำระ: {o.paymentMethod ?? "—"}
                  </span>
                </div>

                {/* pills */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">โซน {o.tierName}</span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
                    แผน · {o.weeks} งวด · {baht(o.weeklyAmount)}
                  </span>
                  <span className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
                    ผ่อน {paidInst}/{totalInst} งวด
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-brand-pink"
                        style={{ width: `${totalInst ? Math.round((paidInst / totalInst) * 100) : 0}%` }}
                      />
                    </span>
                  </span>
                </div>

                {isDocsRejected(o.status) && o.docsRejectionReason ? (
                  <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-500">
                    เอกสารไม่ผ่าน: {o.docsRejectionReason}
                  </p>
                ) : null}

                <div className="mt-4 border-t border-slate-100 pt-4">
                  {/* timeline + amount */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="flex items-center">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              tl.cancelled ? "bg-slate-200" : i < tl.done ? "bg-brand-pink" : "border-2 border-slate-200 bg-white"
                            }`}
                          />
                          {i < 3 ? (
                            <span className={`h-0.5 w-6 ${!tl.cancelled && i < tl.done - 1 ? "bg-brand-pink" : "bg-slate-200"}`} />
                          ) : null}
                        </span>
                      ))}
                      <span className={`ml-2 text-xs ${tl.cancelled ? "text-rose-500" : "text-slate-500"}`}>{tl.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-navy">{baht(paidAmount)}</p>
                      <p className="text-xs text-slate-400">
                        {remaining > 0.001 ? `คงเหลือ ${baht(remaining)}` : `จาก ${baht(o.totalAmount)}`} · {fmtDate(o.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* admin actions */}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
                            <label className="block text-xs font-medium text-brand-navy">เหตุผล / เอกสารที่ต้องแก้ไข</label>
                            <textarea
                              name="reason"
                              required
                              rows={3}
                              placeholder="เช่น รูปบัตรประชาชนไม่ชัด กรุณาถ่ายใหม่"
                              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-rose-400 focus:outline-none"
                            />
                            <button className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
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
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
