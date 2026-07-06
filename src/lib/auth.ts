// Server-side auth guards for pages and actions.
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Memoized per request: a page and its AppShell both call requireUser(), so
// without this the same user row would be fetched twice on every page load.
const getUserById = cache((lineUserId: string) =>
  prisma.user.findUnique({ where: { lineUserId } })
);

// Require a logged-in user; returns the User row.
export async function requireUser() {
  const userId = getSessionUserId();
  if (!userId) redirect("/");
  const user = await getUserById(userId);
  if (!user) redirect("/");
  return user;
}

// Require an ADMIN user; non-admins get bounced to their dashboard.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
