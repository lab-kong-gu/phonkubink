import { requireAdmin } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

type AdminNavKey = "overview" | "concerts" | "orders" | "slips";

// Wraps every admin page with the light "ADMIN PANEL" sidebar. Also enforces admin access.
export default async function AdminShell({
  active,
  children,
}: {
  active: AdminNavKey;
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar active={active} user={{ displayName: user.displayName, pictureUrl: user.pictureUrl }} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
