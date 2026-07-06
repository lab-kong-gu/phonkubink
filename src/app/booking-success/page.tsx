// Shown right after a booking is placed (createOrder redirects here).
import Link from "next/link";
import { IconCheck } from "../_components/icons";

export const dynamic = "force-dynamic";

export default function BookingSuccess() {
  return (
    <main className="min-h-screen bg-[#FFF6F0]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#DFF3EA]">
          <IconCheck className="h-10 w-10 text-[#0F766E]" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-brand-navy">จองคิวสำเร็จ 🎉</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#7A6F6A]">
          เราได้ส่งใบแจ้งชำระมัดจำไปที่แชท LINE ของคุณแล้ว
          <br />
          โอนมัดจำแล้วส่งรูปสลิปกลับมาในแชทเพื่อยืนยันการจองได้เลยครับ
        </p>

        <Link
          href="/dashboard"
          className="mt-8 flex w-full items-center justify-center rounded-2xl bg-brand-pink px-6 py-4 text-[15px] font-semibold text-white hover:opacity-90"
        >
          ไปที่แดชบอร์ด
        </Link>
        <Link href="/tickets" className="mt-3 text-sm font-medium text-brand-pink hover:underline">
          ดูการจองของฉัน
        </Link>
      </div>
    </main>
  );
}
