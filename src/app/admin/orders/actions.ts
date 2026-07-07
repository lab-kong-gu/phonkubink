"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { nextStatus } from "@/lib/orderStatus";
import { remainingAmount } from "@/lib/money";
import {
  pushMessages,
  buildTicketIssuedFlex,
  buildDocsApprovedFlex,
  buildDocsRejectedFlex,
} from "@/lib/linePush";

// Move an order to the next step in the booking flow.
export async function advanceOrder(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { concert: true, installments: true },
  });
  if (!order) return;
  const next = nextStatus(order.status);
  if (!next) return;
  await prisma.order.update({ where: { id }, data: { status: next as never } });

  if (next === "TICKET_ISSUED") {
    // The weekly installment plan only starts once the customer actually has
    // the ticket. The งวด were created at booking time with placeholder due
    // dates; re-anchor them to the issue date now — preserving the original
    // 7- or 15-day spacing (read from the first two rows) — and clear any
    // reminder flags so reminders fire relative to the new schedule.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const weekly = order.installments
      .filter((i) => !i.isDownPayment)
      .sort((a, b) => a.weekNumber - b.weekNumber);
    const intervalDays =
      weekly.length >= 2
        ? Math.max(1, Math.round((weekly[1].dueDate.getTime() - weekly[0].dueDate.getTime()) / DAY_MS))
        : 7;
    const anchor = Date.now();
    await Promise.all(
      weekly.map((inst, idx) =>
        prisma.installment.update({
          where: { id: inst.id },
          data: {
            dueDate: new Date(anchor + (idx + 1) * intervalDays * DAY_MS),
            reminderSentAt: null,
          },
        })
      )
    );

    await pushMessages(order.lineUserId, [
      buildTicketIssuedFlex({
        id: order.id,
        tierName: order.tierName,
        concertName: order.concert.name,
        totalAmount: order.totalAmount,
      }),
    ]);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/tickets");
}

export async function cancelOrderAdmin(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

// Admin reviewed the customer's submitted paperwork and it's good — moves the
// order to DOCS_APPROVED (ready for ticket issuance) and clears any previous
// rejection reason.
export async function approveDocsOrder(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { concert: true, installments: true },
  });
  if (!order) return;
  if (order.status !== "AWAITING_DOCS" && order.status !== "CONFIRMED" && order.status !== "DOCS_REJECTED") return;

  // Docs approved → the customer now pays the rest of the down payment. If the
  // down payment already happens to be fully paid, skip straight to รอกดบัตร.
  const down = order.installments.find((i) => i.isDownPayment);
  const remainingDown = down ? remainingAmount(down.amount, down.amountPaid) : 0;
  const newStatus = remainingDown > 0.001 ? "AWAITING_DOWNPAYMENT" : "AWAITING_TICKET";

  await prisma.order.update({
    where: { id },
    data: { status: newStatus, docsRejectionReason: null },
  });

  await pushMessages(order.lineUserId, [
    buildDocsApprovedFlex(
      { id: order.id, tierName: order.tierName, concertName: order.concert.name, totalAmount: order.totalAmount },
      remainingDown
    ),
  ]);

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/tickets");
}

// Admin reviewed the paperwork and something's wrong — moves the order to
// DOCS_REJECTED with an admin-filled reason describing what's missing or
// needs correcting, and pushes that reason to the customer over LINE.
export async function rejectDocsOrder(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const reason = (formData.get("reason") ?? "").toString().trim();
  if (!reason) return;

  const order = await prisma.order.findUnique({ where: { id }, include: { concert: true } });
  if (!order) return;
  if (order.status !== "AWAITING_DOCS" && order.status !== "CONFIRMED") return;

  await prisma.order.update({
    where: { id },
    data: { status: "DOCS_REJECTED", docsRejectionReason: reason },
  });

  await pushMessages(order.lineUserId, [
    buildDocsRejectedFlex(
      { id: order.id, tierName: order.tierName, concertName: order.concert.name, totalAmount: order.totalAmount },
      reason
    ),
  ]);

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/tickets");
}

// Customer (or admin, on their behalf) says the corrected paperwork has been
// resubmitted — sends the order back to AWAITING_DOCS for another review pass.
export async function resubmitDocsOrder(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.status !== "DOCS_REJECTED") return;

  await prisma.order.update({
    where: { id },
    data: { status: "AWAITING_DOCS", docsRejectionReason: null },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/tickets");
}
