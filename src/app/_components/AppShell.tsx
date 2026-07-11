import { requireUser } from "@/lib/auth";
import Sidebar from "./Sidebar";

type NavKey = "dashboard" | "concerts" | "tickets";

// Wraps every logged-in page with the navy sidebar.
export default async function AppShell({
  active,
  children,
}: {
  active: NavKey;
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        active={active}
        isAdmin={user.role === "ADMIN"}
        user={{ displayName: user.displayName, email: user.email, pictureUrl: user.pictureUrl }}
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
