"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createOrder } from "../actions";
import { IconCheck, IconShield } from "../../_components/icons";

type PlanOpt = { id: string; weeks: number; weeklyAmount: string };
type TierOpt = { id: string; name: string; price: string; downAmount: string; plans: PlanOpt[] };

export default function BookingForm({
  concertId,
  tiers,
  defaultName,
  defaultPhone,
}: {
  concertId: string;
  tiers: TierOpt[];
  defaultName: string;
  defaultPhone: string;
}) {
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Pop the success card up immediately, then persist the order + push the
    // LINE invoice in the background — the card doesn't wait for the server.
    setDone(true);
    startTransition(() => {
      createOrder(formData);
    });
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="sticky top-6 space-y-4 rounded-2xl border border-brand-pink/30 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="concertId" value={concertId} />
        <h3 className="flex items-center gap-2 text-lg font-bold text-brand-navy">🛍️ กรอกข้อมูลการผ่อนบัตร</h3>

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">ชื่อ - นามสกุล *</label>
          <input
            name="fullName"
            required
            defaultValue={defaultName}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">เบอร์โทรศัพท์ *</label>
          <input
            name="phone"
            required
            defaultValue={defaultPhone}
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
            {tiers.map((t) => (
              <optgroup key={t.id} label={`${t.name} · ${t.price}`}>
                {t.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.weeks} อาทิตย์ · ดาวน์ {t.downAmount} + {p.weeklyAmount}/งวด
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

      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DFF3EA]">
              <IconCheck className="h-10 w-10 text-[#0F766E]" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-brand-navy">จองคิวสำเร็จ 🎉</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              เราได้ส่งใบแจ้งชำระมัดจำไปที่แชท LINE ของคุณแล้ว โอนมัดจำแล้วส่งรูปสลิปกลับมาในแชทเพื่อยืนยันการจองได้เลยครับ
            </p>
            <Link
              href="/dashboard"
              className="mt-6 block w-full rounded-2xl bg-brand-pink px-6 py-3.5 font-semibold text-white hover:opacity-90"
            >
              ไปที่แดชบอร์ด
            </Link>
            <Link href="/tickets" className="mt-3 inline-block text-sm font-medium text-brand-pink hover:underline">
              ดูการจองของฉัน
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
