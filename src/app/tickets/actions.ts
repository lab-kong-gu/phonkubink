"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { pushMessages, buildDepositInvoiceFlex, buildPlanUpdatedFlex } from "@/lib/linePush";
import { depositAmountFor, remainingAmount } from "@/lib/money";
import { buildInstallments } from "@/lib/orderBuilder";

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

// Change the tier/plan/frequency on one of the current user's own orders.
// Allowed any time up until a งวด (weekly installment) has been paid — the
// deposit (or even the full down payment) being already paid is fine: that
// money carries over to the new plan's down payment instead of being wiped.
// Once a weekly installment has money on it, the plan is locked in — the
// weekly schedule is too entangled with what's already been paid to safely
// reshuffle automatically.
export async function updateOrderPlan(formData: FormData) {
  const user = await requireUser();
  const orderId = (formData.get("orderId") ?? "").toString();
  const planId = (formData.get("planId") ?? "").toString();
  const biweekly = (formData.get("frequency") ?? "WEEKLY").toString() === "BIWEEKLY";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { installments: true },
  });
  if (!order || order.lineUserId !== user.lineUserId) redirect("/tickets");

  const notLocked = order.status !== "CANCELLED" && order.status !== "COMPLETED" && order.status !== "TICKET_ISSUED";
  const weeklyUntouched = order.installments
    .filter((i) => !i.isDownPayment)
    .every((i) => parseFloat(String(i.amountPaid)) <= 0);
  if (!notLocked || !weeklyUntouched) redirect("/tickets");

  const plan = await prisma.installmentPlan.findUnique({
    where: { id: planId },
    include: { tier: { include: { concert: true } } },
  });
  if (!plan || !plan.isActive || plan.tier.concertId !== order.concertId) {
    redirect("/tickets");
  }

  const tier = plan.tier;
  const { installments, total } = buildInstallments({
    downAmount: tier.downAmount,
    weeklyAmount: plan.weeklyAmount,
    weeks: plan.weeks,
    biweekly,
  });
  const [newDownPayment, ...newWeeklyInstallments] = installments;

  const existingDown = order.installments.find((i) => i.isDownPayment);
  const alreadyPaid = existingDown ? parseFloat(String(existingDown.amountPaid)) : 0;
  const newDownAmount = parseFloat(String(newDownPayment.amount));
  const newDownStatus = alreadyPaid <= 0 ? "PENDING" : alreadyPaid >= newDownAmount - 0.001 ? "PAID" : "PARTIAL";

  const updated = await prisma.$transaction(async (tx) => {
    // Weekly installments are guaranteed unpaid (guarded above) — safe to wipe and regenerate.
    await tx.installment.deleteMany({ where: { orderId, isDownPayment: false } });
    await tx.installment.createMany({ data: newWeeklyInstallments.map((i) => ({ ...i, orderId })) });

    // The down-payment row keeps its id (and PaymentLog history) — only its
    // target amount/status change, so whatever was already paid carries over.
    if (existingDown) {
      await tx.installment.update({
        where: { id: existingDown.id },
        data: {
          amount: newDownPayment.amount,
          status: newDownStatus,
          paidAt: newDownStatus === "PAID" ? existingDown.paidAt ?? new Date() : null,
        },
      });
    } else {
      await tx.installment.create({ data: { ...newDownPayment, orderId } });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        tierId: tier.id,
        planId: plan.id,
        tierName: tier.name,
        ticketPrice: tier.price,
        weeks: plan.weeks,
        downAmount: tier.downAmount,
        weeklyAmount: plan.weeklyAmount,
        totalAmount: total,
      },
      include: { installments: true },
    });
  });

  const downInst = updated.installments.find((i) => i.isDownPayment);
  const orderInfo = {
    id: updated.id,
    tierName: updated.tierName,
    concertName: tier.concert.name,
    totalAmount: updated.totalAmount,
  };

  if (downInst && newDownStatus === "PENDING") {
    // Nothing paid at all — same as a brand new booking, send the deposit invoice.
    const depositAmount = depositAmountFor(downInst.amount);
    await pushMessages(user.lineUserId, [buildDepositInvoiceFlex(orderInfo, depositAmount, downInst.amount)]);
  } else if (downInst) {
    // Something (deposit or more) already paid — tell them what carried over.
    const remaining = remainingAmount(downInst.amount, downInst.amountPaid);
    await pushMessages(user.lineUserId, [
      buildPlanUpdatedFlex(orderInfo, downInst.amountPaid, downInst.amount, remaining),
    ]);
  }

  revalidatePath("/tickets");

  // No web pay page anymore — payment happens over LINE (transfer + slip photo).
  redirect("/tickets");
}
