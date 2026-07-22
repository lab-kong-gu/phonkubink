// Admin: จัดการรูปแบนเนอร์โปรโมชัน (แสดงในสไลด์หน้า dashboard ของผู้ใช้)
import AdminShell from "../_components/AdminShell";
import HeroCarousel from "../../_components/HeroCarousel";
import { listBanners } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";
import { addBanner, removeBanner } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminBanners() {
  const [banners, concerts] = await Promise.all([
    listBanners(),
    prisma.concert.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      take: 5,
    }),
  ]);

  return (
    <AdminShell active="banners">
      <h1 className="text-2xl font-bold text-brand-navy">แบนเนอร์โปรโมชัน</h1>
      <p className="mt-1 text-sm text-slate-500">
        รูปที่อัปโหลดจะแสดงเป็นสไลด์แบนเนอร์บนหน้าแรกของผู้ใช้ (แนะนำสัดส่วนแนวนอน เช่น 1200×400)
      </p>

      {/* Preview — เหมือนที่ผู้ใช้เห็นบนหน้า dashboard (โปรโมชัน + โปสเตอร์คอนเสิร์ต) */}
      {(banners.length > 0 || concerts.some((c) => c.posterUrl)) && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-brand-navy">ตัวอย่างที่ผู้ใช้เห็น</p>
          <HeroCarousel
            slides={[
              ...banners.map((b) => ({ id: b.path, imageUrl: b.url, title: "" })),
              ...concerts
                .filter((c) => c.posterUrl)
                .map((c) => ({
                  id: c.id,
                  imageUrl: c.posterUrl,
                  title: c.name,
                  subtitle: `${c.venue ?? "—"} · ${fmtDate(c.eventDate)}`,
                })),
            ]}
          />
        </div>
      )}

      {/* Upload */}
      <form
        action={addBanner}
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center"
      >
        <input
          type="file"
          name="image"
          accept="image/*"
          required
          className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          อัปโหลดแบนเนอร์
        </button>
      </form>

      {/* List */}
      {banners.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          ยังไม่มีแบนเนอร์ — อัปโหลดรูปแรกได้เลย
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <div key={b.path} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" className="h-36 w-full object-cover" />
              <div className="flex items-center justify-between p-3">
                <span className="truncate text-xs text-slate-400">{b.path}</span>
                <form action={removeBanner}>
                  <input type="hidden" name="path" value={b.path} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                  >
                    ลบ
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
