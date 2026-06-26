import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "../../_components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/format";
import { IconPin, IconCalendar, IconClock, IconShield } from "../../_components/icons";
import { createOrder } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConcertDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const concert = await prisma.concert.findUnique({
    where: { id: params.id },
    include: {
      tiers: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { price: "desc" }],
        include: { plans: { where: { isActive: true }, orderBy: { weeks: "asc" } } },
      },
    },
  });
  if (!concert || concert.status !== "PUBLISHED") notFound();

  // Columns of the matrix = all plan lengths offered across tiers.
  const weeks = Array.from(
    new Set(concert.tiers.flatMap((t) => t.plans.map((p) => p.weeks)))
  ).sort((a, b) => a - b);

  const prices = concert.tiers.map((t) => Number(t.price));
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const hasPlans = concert.tiers.some((t) => t.plans.length > 0);

  return (
    <AppShell active="concerts">
      <Link href="/concerts" className="text-sm text-slate-500 hover:underline">
        ← กลับไปหน้าคอนเสิร์ต
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: poster + info + matrix */}
        <div className="lg:col-span-2">
          {concert.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={concert.posterUrl}
              alt={concert.name}
              className="mx-auto block max-h-[32rem] max-w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="h-64 w-full rounded-2xl bg-gradient-to-br from-brand-pink/30 to-brand-navy/30" />
          )}

          <span className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            คอนเสิร์ต
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">{concert.name}</h1>
          {concert.artist ? <p className="text-brand-pink">❤️ {concert.artist}</p> : null}

          <div className="mt-4 space-y-1.5 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-brand-pink" /> {fmtDate(concert.eventDate)}
            </p>
            <p className="flex items-center gap-2">
              <IconPin className="h-4 w-4 text-brand-pink" /> {concert.venue ?? "—"}
            </p>
            <p className="flex items-center gap-2">
              <IconClock className="h-4 w-4 text-brand-pink" /> {fmtTime(concert.eventDate)} น. เป็นต้นไป
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">🎫 เริ่มต้น {baht(fromPrice)}</span>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">💺 {concert.tiers.length} โซน</span>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">🔒 ปลอดภัย 100%</span>
          </div>

          {concert.description ? (
            <p className="mt-4 whitespace-pre-line text-sm text-slate-600">{concert.description}</p>
          ) : null}

          <h2 className="mb-2 mt-8 flex items-center gap-2 text-lg font-bold text-brand-navy">
            💡 ตารางผ่อนบัตรคอนเสิร์ต
          </h2>
          {!hasPlans ? (
            <p className="text-sm text-slate-400">คอนเสิร์ตนี้ยังไม่มีแผนผ่อน</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-[#FCE7F1] text-brand-navy">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">โซน</th>
                    <th className="px-3 py-3 text-right font-semibold">ราคาบัตร</th>
                    <th className="px-3 py-3 text-right font-semibold">วางดาวน์</th>
                    {weeks.map((w) => (
                      <th key={w} className="px-3 py-3 text-right font-semibold">
                        {w} อาทิตย์
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {concert.tiers.map((t) => {
                    const byWeek = new Map(t.plans.map((p) => [p.weeks, p.weeklyAmount]));
                    return (
                      <tr key={t.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-medium text-brand-navy">{t.name}</td>
                        <td className="px-3 py-3 text-right font-semibold text-brand-navy">{baht(t.price)}</td>
                        <td className="px-3 py-3 text-right text-brand-pink">{baht(t.downAmount)}</td>
                        {weeks.map((w) => (
                          <td key={w} className="px-3 py-3 text-right text-slate-600">
                            {byWeek.has(w) ? baht(byWeek.get(w)) : "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            ⭐ ตัวเลขคือยอด/สัปดาห์ · เลือกจ่ายทุก 15 วันได้ตอนชำระ (รวม 2 งวด = จ่าย 2 เท่า) · ยอดรวมเท่ากัน
          </p>
        </div>

        {/* Right: purchase form */}
        <div className="lg:col-span-1">
          <form
            action={createOrder}
            className="sticky top-6 space-y-4 rounded-2xl border border-brand-pink/30 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="concertId" value={concert.id} />
            <h3 className="flex items-center gap-2 text-lg font-bold text-brand-navy">🛍️ กรอกข้อมูลการผ่อนบัตร</h3>

            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">ชื่อ - นามสกุล *</label>
              <input
                name="fullName"
                required
                defaultValue={user.displayName ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">เบอร์โทรศัพท์ *</label>
              <input
                name="phone"
                required
                defaultValue={user.phone ?? ""}
                placeholder="เช่น 08xxxxxxxx"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">เลือกโซน + แผนผ่อน *</label>
              <select
                name="planId"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none"
              >
                {concert.tiers.map((t) => (
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

            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">ความถี่การผ่อน *</label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <input type="radio" name="frequency" value="WEEKLY" defaultChecked className="accent-pink-500" />
                  รายสัปดาห์ (ทุก 7 วัน)
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <input type="radio" name="frequency" value="BIWEEKLY" className="accent-pink-500" />
                  ทุก 15 วัน (รวม 2 งวด = จ่าย 2 เท่า)
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-pink px-5 py-3 font-semibold text-white hover:opacity-90"
            >
              🔒 ยืนยันการจอง
            </button>
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <IconShield className="h-4 w-4" /> ข้อมูลของคุณปลอดภัย 100%
            </p>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
