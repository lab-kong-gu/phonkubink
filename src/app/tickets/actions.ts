"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Cancel one of the current user's own orders.
export async function cancelOrder(formData: FormData) {
  const user = await requireUser();
  const id = (formData.get("id") ?? "").toString();

  // Only cancel if it belongs to this user (and isn't already cancelled/completed).
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.lineUserId !== user.lineUserId) return;
  if (order.status === "CANCELLED" || order.status === "COMPLETED") return;

  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/tickets");
}
