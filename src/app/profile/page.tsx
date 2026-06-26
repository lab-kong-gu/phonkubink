import AppShell from "../_components/AppShell";
import { requireUser } from "@/lib/auth";
import { IconCheck, IconChevronRight } from "../_components/icons";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-pink focus:outline-none";

export default async function Profile() {
  const user = await requireUser();

  return (
    <AppShell active="profile">
      <h1 className="text-3xl font-extrabold text-brand-navy">User Profile</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Avatar column */}
        <div className="flex flex-col items-center">
          {user.pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.pictureUrl} alt="" className="h-40 w-40 rounded-full object-cover" />
          ) : (
            <div className="h-40 w-40 rounded-full bg-slate-200" />
          )}
          <p className="mt-4 text-xl font-bold text-brand-navy">{user.displayName ?? "ผู้ใช้"}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-brand-navy">
            <IconCheck className="h-3.5 w-3.5 text-brand-pink" /> Verified User
          </span>
        </div>

        {/* Form column */}
        <div className="max-w-lg">
          <form action={updateProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">Full Name</label>
              <input name="displayName" defaultValue={user.displayName ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">Email</label>
              <input
                value={user.email ?? "—"}
                disabled
                className={`${inputCls} cursor-not-allowed bg-slate-100 text-slate-400`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">Phone Number</label>
              <input name="phone" defaultValue={user.phone ?? ""} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">Address</label>
              <textarea name="address" rows={3} defaultValue={user.address ?? ""} className={inputCls} />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-pink px-5 py-3 font-semibold text-white hover:opacity-90"
            >
              Save Changes
            </button>
          </form>

          <h2 className="mb-2 mt-10 text-lg font-bold text-brand-navy">Security settings</h2>
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 text-sm text-slate-400">
              <span>🔑 Change password</span>
              <IconChevronRight className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 text-sm text-slate-400">
              <span>🔒 2-factor authentication</span>
              <IconChevronRight className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            * คุณเข้าสู่ระบบด้วย LINE — รหัสผ่าน/2FA จัดการผ่านบัญชี LINE ของคุณ
          </p>
        </div>
      </div>
    </AppShell>
  );
}
