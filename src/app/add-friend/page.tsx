import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default function AddFriend() {
  const userId = getSessionUserId();
  if (!userId) redirect("/");

  const basicId = process.env.LINE_OA_BASIC_ID || "";
  const addUrl = `https://line.me/R/ti/p/${encodeURIComponent(basicId)}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12 text-center">
      <h1 className="text-2xl font-bold text-brand-navy">
        เพิ่มเพื่อน <span className="text-brand-pink">ผ่อนกับอิ้ง</span> ก่อนนะ
      </h1>
      <p className="text-sm text-slate-500">
        ก่อนใช้งาน กรุณาเพิ่ม LINE Official Account ของเราเป็นเพื่อน เพื่อรับใบแจ้งหนี้และแจ้งเตือนการผ่อนชำระ
      </p>

      <a
        href={addUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto w-fit rounded-lg bg-brand-pink px-6 py-3 font-semibold text-white hover:opacity-90"
      >
        ➕ เพิ่มเพื่อนใน LINE
      </a>

      <p className="text-sm text-slate-500">เพิ่มเสร็จแล้ว กดปุ่มด้านล่างเพื่อเข้าสู่ระบบอีกครั้ง</p>
      <a
        href="/api/auth/line/login"
        className="mx-auto w-fit rounded-lg border border-slate-300 px-5 py-2 text-sm text-brand-navy hover:bg-slate-50"
      >
        เพิ่มแล้ว — ดำเนินการต่อ
      </a>
    </main>
  );
}
