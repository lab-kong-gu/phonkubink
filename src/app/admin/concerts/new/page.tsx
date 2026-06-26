import Link from "next/link";
import AdminShell from "../../_components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import ConcertForm from "../../ConcertForm";
import { createConcert } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewConcert() {
  await requireAdmin();

  return (
    <AdminShell active="concerts">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-sm text-slate-500 hover:underline">
          ← กลับ
        </Link>
        <h1 className="mb-6 mt-2 text-2xl font-bold text-brand-navy">เพิ่มคอนเสิร์ตใหม่</h1>
        <ConcertForm action={createConcert} submitLabel="สร้างคอนเสิร์ต" />
        <p className="mt-4 text-xs text-slate-400">
          สร้างเสร็จแล้วจะไปหน้าแก้ไข เพื่อเพิ่มแผนผ่อนให้คอนเสิร์ตนี้
        </p>
      </div>
    </AdminShell>
  );
}
