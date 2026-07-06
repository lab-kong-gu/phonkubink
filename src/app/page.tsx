// Home / login landing. Server Component, so it can read the session.
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { IconCalendar, IconBell, IconShield } from "./_components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Already logged in (valid cookie AND the user still exists) → go straight to
  // the dashboard; the landing below is only for logged-out visitors.
  const userId = getSessionUserId();
  if (userId && (await prisma.user.findUnique({ where: { lineUserId: userId } }))) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#FFF6F0]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ผ่อนบัตรร้านอิ๊งค์" className="h-11 w-11 rounded-full" />
          <span className="text-[15px] font-semibold text-brand-navy">ผ่อนบัตรร้านอิ๊งค์</span>
        </div>

        <h1 className="mt-8 text-[27px] font-bold leading-snug text-brand-navy">
          ดูคอนเสิร์ตที่อยากดู
          <br />
          แล้ว<span className="text-brand-pink">ผ่อนสบาย ๆ</span>
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#7A6F6A]">
          แบ่งจ่ายเป็นงวด เริ่มแค่มัดจำ แจ้งบิลและส่งสลิปได้ในแชท LINE เลย
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Feature bg="#FCE7F1" fg="#C13B72" Icon={IconCalendar} title="ผ่อนสบาย" desc="แบ่งจ่ายเป็นงวด ไม่ต้องจ่ายเต็ม" />
          <Feature bg="#FFE8D6" fg="#C2691C" Icon={IconBell} title="ยืนยันผ่าน LINE" desc="แจ้งบิล ส่งสลิป รับใบเสร็จ ในแชทเดียว" />
          <Feature bg="#DFF3EA" fg="#0F766E" Icon={IconShield} title="ปลอดภัย" desc="ตรวจสอบสลิปอัตโนมัติ" />
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4">
          <p className="mb-3 text-[13px] font-semibold text-brand-navy">ใช้งานง่าย ๆ 3 ขั้นตอน</p>
          <ol className="flex flex-col gap-3">
            <Step n={1} text="เข้าสู่ระบบด้วย LINE" />
            <Step n={2} text="เลือกคอนเสิร์ตและแผนผ่อน" />
            <Step n={3} text="โอนมัดจำ แล้วส่งสลิปในแชท" />
          </ol>
        </div>

        <div className="mt-auto pt-6">
          <a
            href="/api/auth/line/login"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-6 py-4 text-[15px] font-semibold text-white hover:opacity-90"
          >
            เข้าสู่ระบบด้วย LINE
          </a>
          <p className="mt-3 text-center text-[11.5px] text-[#A99F99]">
            เข้าสู่ระบบเพื่อเริ่มจองบัตรและผ่อนชำระ
          </p>
        </div>
      </div>
    </main>
  );
}

function Feature({
  bg,
  fg,
  Icon,
  title,
  desc,
}: {
  bg: string;
  fg: string;
  Icon: (p: { className?: string }) => JSX.Element;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ backgroundColor: bg }}>
      <span style={{ color: fg }}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <div className="text-sm font-semibold text-brand-navy">{title}</div>
        <div className="text-[12.5px] text-[#8A7F7A]">{desc}</div>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#FCE7F1] text-xs font-semibold text-[#C13B72]">
        {n}
      </span>
      <span className="text-[13px] text-[#5F5A57]">{text}</span>
    </li>
  );
}
