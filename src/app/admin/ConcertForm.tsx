// Shared add/edit concert form. Server Component — posts to a Server Action.
import type { Concert } from "@prisma/client";

const STATUSES = ["DRAFT", "PUBLISHED", "SOLD_OUT", "CANCELLED"] as const;

function toLocalInput(d?: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const labelCls = "block text-sm font-medium text-brand-navy mb-1";
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-pink focus:outline-none";

export default function ConcertForm({
  action,
  concert,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  concert?: Concert;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {concert ? <input type="hidden" name="id" value={concert.id} /> : null}

      <div>
        <label className={labelCls}>ชื่อคอนเสิร์ต *</label>
        <input name="name" required defaultValue={concert?.name ?? ""} className={inputCls} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>ศิลปิน</label>
          <input name="artist" defaultValue={concert?.artist ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>สถานที่</label>
          <input name="venue" defaultValue={concert?.venue ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>วันแสดง</label>
          <input
            type="datetime-local"
            name="eventDate"
            defaultValue={toLocalInput(concert?.eventDate)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>สถานะ</label>
          <select name="status" defaultValue={concert?.status ?? "DRAFT"} className={inputCls}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>รูปโปสเตอร์</label>
        {concert?.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={concert.posterUrl} alt="" className="mb-2 h-32 rounded-lg object-cover" />
        ) : null}
        <input type="file" name="poster" accept="image/*" className={inputCls} />
        {concert ? (
          <p className="mt-1 text-xs text-slate-400">เว้นว่างไว้ = ใช้รูปเดิม</p>
        ) : null}
      </div>

      <div>
        <label className={labelCls}>รายละเอียด</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={concert?.description ?? ""}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
