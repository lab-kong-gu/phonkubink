"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { nextStatus } from "@/lib/orderStatus";

// Move an order to the next step in the booking flow.
export async function advanceOrder(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return;
  const next = nextStatus(order.status);
  if (!next) return;
  await prisma.order.update({ where: { id }, data: { status: next as never } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function cancelOrderAdmin(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}
