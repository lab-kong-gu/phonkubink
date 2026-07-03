import AdminShell from "../_components/AdminShell";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/format";
import { getSignedSlipUrl } from "@/lib/storage";
import { confirmSlipSubmission, rejectSlipSubmission } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSlips() {
  const submissions = await prisma.slipSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  const reviewed = await prisma.slipSubmission.findMany({
    where: { status: { in: ["CONFIRMED", "REJECTED"] } },
    orderBy: { reviewedAt: "desc" },
    take: 15,
    include: { user: true },
  });

  // For each pending submission, fetch that customer's open installments
  // (for the picker) and a signed URL for the slip image.
  const rows = await Promise.all(
    submissions.map(async (s) => {
      const [candidates, imageUrl] = await Promise.all([
        prisma.installment.findMany({
          where: {
            status: { in: ["PENDING", "PARTIAL"] },
            order: { lineUserId: s.lineUserId, status: { notIn: ["CANCELLED", "TICKET_ISSUED", "COMPLETED"] } },
          },
          orderBy: { dueDate: "asc" },
          include: { order: { include: { concert: true } } },
        }),
        s.imagePath ? getSignedSlipUrl(s.imagePath) : Promise.resolve(null),
      ]);
      return { submission: s, candidates, imageUrl };
    })
  );

  return (
    <AdminShell active="slips">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">ตรวจสลิปโอนเงิน</h1>
        <p className="text-sm text-slate-500">
          รายการสลิปที่ตรวจสอบอัตโนมัติไม่สำเร็จ (ยอดไม่ตรง / สลิปซ้ำ / มีรายการค้างชำระหลายรายการ) ต้องยืนยันด้วยตนเอง
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          ไม่มีสลิปที่รอตรวจสอบ 🎉
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {rows.map(({ submission: s, candidates, imageUrl }) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-4">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="สลิปโอนเงิน" className="h-32 w-32 shrink-0 rounded-xl border border-slate-200 object-cover" />
                ) : (
                  <div className="grid h-32 w-32 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs text-slate-400">
                    ไม่มีรูป
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-brand-navy">{s.user.displayName ?? "ลูกค้า"}</p>
                  <p className="text-xs text-slate-400">{fmtDate(s.createdAt)} · {fmtTime(s.createdAt)}</p>
                  {s.amountInSlip ? (
                    <p className="mt-1 text-xs text-slate-600">ยอดในสลิป: {baht(s.amountInSlip)}</p>
                  ) : null}
                  {s.isDuplicate ? (
                    <p className="mt-1 text-xs font-medium text-rose-600">⚠️ สลิปนี้อาจเคยถูกใช้แล้ว</p>
                  ) : null}
                  {s.note ? <p className="mt-1 text-xs text-amber-600">{s.note}</p> : null}
                </div>
              </div>

              <form action={confirmSlipSubmission} className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <input type="hidden" name="submissionId" value={s.id} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-navy">รายการที่ต้องการยืนยัน</label>
                  <select
                    name="installmentId"
                    required
                    defaultValue={s.installmentId ?? candidates[0]?.id ?? ""}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-pink focus:outline-none"
                  >
                    <option value="" disabled>
                      เลือกรายการ
                    </option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.order.concert.name} · {c.isDownPayment ? "เงินดาวน์" : `งวด ${c.weekNumber}`} ·{" "}
                        {baht(c.amount)} (จ่ายแล้ว {baht(c.amountPaid)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-navy">จำนวนเงินที่จะยืนยัน (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    defaultValue={s.amountInSlip ? String(s.amountInSlip) : undefined}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-pink focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  ยืนยันการชำระเงิน
                </button>
              </form>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-rose-500 hover:underline">ปฏิเสธสลิปนี้</summary>
                <form action={rejectSlipSubmission} className="mt-2 space-y-2 rounded-lg border border-rose-100 bg-rose-50 p-3">
                  <input type="hidden" name="submissionId" value={s.id} />
                  <textarea
                    name="reason"
                    rows={2}
                    placeholder="เหตุผล (จะส่งให้ลูกค้าทาง LINE)"
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-rose-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    ปฏิเสธ
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">ตรวจสอบล่าสุด</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">ลูกค้า</th>
                  <th className="px-4 py-2 font-semibold">วันที่</th>
                  <th className="px-4 py-2 font-semibold">สถานะ</th>
                  <th className="px-4 py-2 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{s.user.displayName ?? "ลูกค้า"}</td>
                    <td className="px-4 py-2 text-slate-500">{fmtDate(s.reviewedAt ?? s.createdAt)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {s.status === "CONFIRMED" ? "ยืนยันแล้ว" : "ปฏิเสธแล้ว"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{s.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
