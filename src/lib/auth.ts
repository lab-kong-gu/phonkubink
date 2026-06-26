// Server-side auth guards for pages and actions.
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Require a logged-in user; returns the User row.
export async function requireUser() {
  const userId = getSessionUserId();
  if (!userId) redirect("/");
  const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
  if (!user) redirect("/");
  return user;
}

// Require an ADMIN user; non-admins get bounced to their dashboard.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
