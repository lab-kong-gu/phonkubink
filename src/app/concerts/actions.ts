"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { pushMessages, buildDepositInvoiceFlex } from "@/lib/linePush";
import { depositAmountFor } from "@/lib/money";
import { buildInstallments } from "@/lib/orderBuilder";

// Customer buys a ticket: picks a plan (which belongs to a tier).
// We snapshot tier + plan terms onto the Order and generate weekly Installments.
export async function createOrder(formData: FormData) {
  const user = await requireUser();
  const concertId = (formData.get("concertId") ?? "").toString();
  const planId = (formData.get("planId") ?? "").toString();
  if (!planId) redirect(`/concerts/${concertId}`);

  const plan = await prisma.installmentPlan.findUnique({
    where: { id: planId },
    include: { tier: { include: { concert: true } } },
  });
  if (!plan || !plan.isActive || plan.tier.concertId !== concertId) {
    redirect(`/concerts/${concertId}`);
  }

  const tier = plan.tier;

  // Billing frequency: weekly (every 7 days, 1 งวด) or biweekly (every 15 days, 2 งวด at once).
  // Total is identical either way — biweekly just regroups the same weekly amounts.
  const biweekly = (formData.get("frequency") ?? "WEEKLY").toString() === "BIWEEKLY";

  const { installments, total } = buildInstallments({
    downAmount: tier.downAmount,
    weeklyAmount: plan.weeklyAmount,
    weeks: plan.weeks,
    biweekly,
  });

  const order = await prisma.order.create({
    data: {
      lineUserId: user.lineUserId,
      concertId,
      customerName: (formData.get("fullName") ?? "").toString().trim() || null,
      customerPhone: (formData.get("phone") ?? "").toString().trim() || null,
      ticketMethod: (formData.get("ticketMethod") ?? "").toString().trim() || null,
      paymentMethod: (formData.get("paymentMethod") ?? "").toString().trim() || null,
      tierId: tier.id,
      planId: plan.id,
      tierName: tier.name,
      ticketPrice: tier.price,
      weeks: plan.weeks,
      downAmount: tier.downAmount,
      weeklyAmount: plan.weeklyAmount,
      totalAmount: total,
      status: "AWAITING_DEPOSIT",
      installments: { create: installments },
    },
    include: { installments: true },
  });

  const downInst = order.installments.find((i) => i.isDownPayment);
  if (downInst) {
    const depositAmount = depositAmountFor(downInst.amount);
    await pushMessages(user.lineUserId, [
      buildDepositInvoiceFlex(
        { id: order.id, tierName: order.tierName, concertName: tier.concert.name, totalAmount: order.totalAmount },
        depositAmount,
        downInst.amount
      ),
    ]);
  }

  revalidatePath("/tickets");
  // No redirect — BookingForm (client) already popped the "จองคิวสำเร็จ" card up
  // the instant the button was pressed. This action just persists the order and
  // pushes the LINE invoice in the background.
}
