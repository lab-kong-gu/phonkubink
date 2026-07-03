import Link from "next/link";
import AppShell from "../_components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baht, remainingAmount } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/format";
import { IconPin, IconCalendar, IconX, IconEdit } from "../_components/icons";
import { cancelOrder, updateOrderPlan } from "./actions";
import { orderStatusLabel } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";

export default async function Tickets() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { lineUserId: user.lineUserId },
    orderBy: { createdAt: "desc" },
    include: {
      concert: {
        include: {
          tiers: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { price: "desc" }],
            include: { plans: { where: { isActive: true }, orderBy: { weeks: "asc" } } },
          },
        },
      },
      installments: { orderBy: { weekNumber: "asc" } },
    },
  });

  return (
    <AppShell active="tickets">
      <h1 className="text-3xl font-extrabold text-brand-navy">Your Ticket History</h1>
      <p className="mt-1 text-sm text-slate-500">View all your past, current, and upcoming ticket details</p>

      {orders.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          ยังไม่มีตั๋ว —{" "}
          <Link href="/concerts" className="text-brand-pink hover:underline">
            ไปเลือกคอนเสิร์ต
          </Link>
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {orders.map((o) => {
            const st = orderStatusLabel(o.status);
            const canCancel = o.status !== "CANCELLED" && o.status !== "COMPLETED";
            const weeklyInstallments = o.installments.filter((i) => !i.isDownPayment);
            const everyDays =
              weeklyInstallments.length >= 2
                ? Math.round(
                    (weeklyInstallments[1].dueDate.getTime() - weeklyInstallments[0].dueDate.getTime()) /
                      86400000
                  )
                : 7;
            // Editable (price/plan) any time up until a งวด has been paid — a
            // paid deposit is fine, it just carries over to the new plan.
            // Locked once the ticket is issued (or the order is done/cancelled).
            const editable =
              o.status !== "CANCELLED" &&
              o.status !== "COMPLETED" &&
              o.status !== "TICKET_ISSUED" &&
              weeklyInstallments.every((i) => parseFloat(String(i.amountPaid)) <= 0);
            return (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex gap-4">
                  {o.concert.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.concert.posterUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-brand-pink/30 to-brand-navy/30" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-brand-navy">{o.concert.name}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <IconPin className="h-3.5 w-3.5" /> {o.concert.venue ?? "—"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <IconCalendar className="h-3.5 w-3.5" /> {fmtDate(o.concert.eventDate)} ·{" "}
                      {fmtTime(o.concert.eventDate)}
                    </p>
                  </div>
                </div>

                {o.status === "DOCS_REJECTED" && o.docsRejectionReason ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <p className="font-semibold">เอกสารไม่ผ่าน — กรุณาส่งเอกสารใหม่</p>
                    <p className="mt-1">{o.docsRejectionReason}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">{o.tierName}</p>
                    <p className="font-medium text-brand-navy">
                      {weeklyInstallments.length} งวด · ทุก {everyDays} วัน
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total Amount</p>
                    <p className="font-semibold text-brand-navy">{baht(o.totalAmount)}</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {canCancel ? (
                    <form action={cancelOrder} className="flex-1">
                      <input type="hidden" name="id" value={o.id} />
                      <button className="flex w-full items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">
                        <IconX className="h-4 w-4" /> Cancel Booking
                      </button>
                    </form>
                  ) : null}
                  {editable ? (
                    <details className="flex-1">
                      <summary className="flex w-full cursor-pointer list-none items-center justify-center gap-1 rounded-lg bg-[#FCE7F1] px-3 py-2 text-xs font-medium text-brand-pink hover:opacity-90">
                        <IconEdit className="h-4 w-4" /> View / Edit
                      </summary>
                      <form
                        action={updateOrderPlan}
                        className="mt-2 space-y-2 rounded-lg border border-brand-pink/30 bg-[#FCE7F1]/40 p-3"
                      >
                        <input type="hidden" name="orderId" value={o.id} />
                        <div>
                          <label className="mb-1 block text-xs font-medium text-brand-navy">โซน + แผนผ่อน</label>
                          <select
                            name="planId"
                            required
                            defaultValue={o.planId ?? undefined}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-pink focus:outline-none"
                          >
                            {o.concert.tiers.map((t) => (
                              <optgroup key={t.id} label={`${t.name} · ${baht(t.price)}`}>
                                {t.plans.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.weeks} อาทิตย์ · ดาวน์ {baht(t.downAmount)} + {baht(p.weeklyAmount)}/งวด
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-600">
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="radio"
                              name="frequency"
                              value="WEEKLY"
                              defaultChecked={everyDays < 10}
                              className="accent-pink-500"
                            />
                            รายสัปดาห์
                          </label>
                          <label className="flex cursor-pointer items-center gap-1">
                            <input
                              type="radio"
                              name="frequency"
                              value="BIWEEKLY"
                              defaultChecked={everyDays >= 10}
                              className="accent-pink-500"
                            />
                            ทุก 15 วัน
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-brand-pink px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                        >
                          บันทึกการเปลี่ยนแปลง
                        </button>
                        <p className="text-[11px] text-slate-400">
                          หากมีมัดจำที่จ่ายแล้ว จะยกยอดไปใช้กับแผนใหม่ให้อัตโนมัติ
                        </p>
                      </form>
                    </details>
                  ) : (
                    <Link
                      href={`/concerts/${o.concertId}`}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#FCE7F1] px-3 py-2 text-xs font-medium text-brand-pink hover:opacity-90"
                    >
                      <IconEdit className="h-4 w-4" /> View
                    </Link>
                  )}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-brand-pink">
                    ดูตารางผ่อน ({weeklyInstallments.length} งวด)
                  </summary>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {o.installments.map((it) => {
                        return (
                          <tr key={it.id} className="border-t border-slate-100">
                            <td className="py-1.5 text-slate-500">
                              {it.isDownPayment ? "เงินดาวน์" : `งวด ${it.weekNumber}`}
                            </td>
                            <td className="py-1.5 text-slate-500">{fmtDate(it.dueDate)}</td>
                            <td className="py-1.5 text-right text-brand-navy">{baht(it.amount)}</td>
                            <td className="py-1.5 text-right text-slate-400">
                              {it.status === "PAID" ? (
                                "ชำระแล้ว"
                              ) : it.status === "PARTIAL" ? (
                                `จ่ายแล้ว ${baht(it.amountPaid)} · คงเหลือ ${baht(remainingAmount(it.amount, it.amountPaid))}`
                              ) : (
                                it.status
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-slate-400">
                    ชำระเงินโดยโอนตามยอดที่แจ้งในแชท LINE แล้วส่งรูปสลิปกลับมาในแชทเพื่อยืนยัน
                  </p>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
