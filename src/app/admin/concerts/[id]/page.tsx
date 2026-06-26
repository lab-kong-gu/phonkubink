import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "../../_components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/money";
import ConcertForm from "../../ConcertForm";
import { updateConcert, createTier, deleteTier, addPlan, deletePlan } from "../../actions";

export const dynamic = "force-dynamic";

const labelCls = "block text-xs font-medium text-brand-navy mb-1";
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none";

export default async function EditConcert({ params }: { params: { id: string } }) {
  await requireAdmin();
  const concert = await prisma.concert.findUnique({
    where: { id: params.id },
    include: {
      tiers: {
        orderBy: [{ sortOrder: "asc" }, { price: "desc" }],
        include: { plans: { orderBy: { weeks: "asc" } } },
      },
    },
  });
  if (!concert) notFound();

  return (
    <AdminShell active="concerts">
      <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="text-sm text-slate-500 hover:underline">
        ← กลับ
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-navy">แก้ไขคอนเสิร์ต</h1>

      <ConcertForm action={updateConcert} concert={concert} submitLabel="บันทึกข้อมูลคอนเสิร์ต" />

      {/* Ticket tiers (seat zones) */}
      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold text-brand-navy">โซน/ราคาบัตร &amp; แผนผ่อน</h2>
        <p className="mb-4 text-xs text-slate-500">
          แต่ละโซนมีราคาและเงินดาวน์ของตัวเอง แล้วเพิ่มงวดผ่อน (จำนวนสัปดาห์ + ยอด/สัปดาห์) ในแต่ละโซน
        </p>

        {concert.tiers.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">ยังไม่มีโซน — เพิ่มด้านล่าง</p>
        ) : (
          <div className="space-y-4">
            {concert.tiers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-brand-navy">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      ราคา {baht(t.price)} · ดาวน์ {baht(t.downAmount)}
                    </p>
                  </div>
                  <form action={deleteTier}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="concertId" value={concert.id} />
                    <button className="text-xs text-rose-500 hover:underline">ลบโซน</button>
                  </form>
                </div>

                {/* Plans (weekly amounts) for this tier */}
                {t.plans.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {t.plans.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="text-brand-navy">
                          {p.weeks} อาทิตย์ · {baht(p.weeklyAmount)}/งวด · รวม{" "}
                          {baht(Number(t.downAmount) + Number(p.weeklyAmount) * p.weeks)}
                        </span>
                        <form action={deletePlan}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="concertId" value={concert.id} />
                          <button className="text-xs text-rose-500 hover:underline">ลบ</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Add a plan length to this tier */}
                <form action={addPlan} className="mt-3 flex items-end gap-2">
                  <input type="hidden" name="concertId" value={concert.id} />
                  <input type="hidden" name="tierId" value={t.id} />
                  <div className="flex-1">
                    <label className={labelCls}>จำนวนสัปดาห์</label>
                    <input type="number" min="1" name="weeks" required defaultValue={8} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>ยอดผ่อน/สัปดาห์ (฿)</label>
                    <input type="number" step="0.01" min="0" name="weeklyAmount" required className={inputCls} />
                  </div>
                  <button className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                    + งวด
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {/* Add a tier */}
        <form action={createTier} className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-brand-navy">+ เพิ่มโซน/ราคา</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input type="hidden" name="concertId" value={concert.id} />
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>ชื่อโซน (ไม่ใส่ก็ได้)</label>
              <input name="name" placeholder="เว้นว่าง = ใช้ราคาเป็นชื่อ" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>ราคาบัตร (฿)</label>
              <input type="number" step="0.01" min="0" name="price" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>เงินดาวน์ (฿)</label>
              <input type="number" step="0.01" min="0" name="downAmount" required defaultValue={0} className={inputCls} />
            </div>
            <div className="flex items-end">
              <button className="w-full rounded-lg bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                เพิ่มโซน
              </button>
            </div>
          </div>
        </form>
      </section>
      </div>
    </AdminShell>
  );
}
