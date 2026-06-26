"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

// Customer buys a ticket: picks a plan (which belongs to a tier).
// We snapshot tier + plan terms onto the Order and generate weekly Installments.
export async function createOrder(formData: FormData) {
  const user = await requireUser();
  const concertId = (formData.get("concertId") ?? "").toString();
  const planId = (formData.get("planId") ?? "").toString();
  if (!planId) redirect(`/concerts/${concertId}`);

  const plan = await prisma.installmentPlan.findUnique({
    where: { id: planId },
    include: { tier: true },
  });
  if (!plan || !plan.isActive || plan.tier.concertId !== concertId) {
    redirect(`/concerts/${concertId}`);
  }

  const tier = plan.tier;
  const weekly = new Prisma.Decimal(plan.weeklyAmount);
  const total = new Prisma.Decimal(tier.downAmount).plus(weekly.times(plan.weeks));

  // Billing frequency: weekly (every 7 days, 1 งวด) or biweekly (every 15 days, 2 งวด at once).
  // Total is identical either way — biweekly just regroups the same weekly amounts.
  const biweekly = (formData.get("frequency") ?? "WEEKLY").toString() === "BIWEEKLY";

  const installments = biweekly
    ? Array.from({ length: Math.ceil(plan.weeks / 2) }, (_, i) => {
        const weeksThis = Math.min(2, plan.weeks - i * 2); // 2, or 1 for an odd last งวด
        return {
          weekNumber: i + 1,
          dueDate: new Date(Date.now() + (i + 1) * 15 * DAY_MS),
          amount: weekly.times(weeksThis),
          status: "PENDING" as const,
        };
      })
    : Array.from({ length: plan.weeks }, (_, i) => ({
        weekNumber: i + 1,
        dueDate: new Date(Date.now() + (i + 1) * 7 * DAY_MS),
        amount: plan.weeklyAmount,
        status: "PENDING" as const,
      }));

  const order = await prisma.order.create({
    data: {
      lineUserId: user.lineUserId,
      concertId,
      customerName: (formData.get("fullName") ?? "").toString().trim() || null,
      customerPhone: (formData.get("phone") ?? "").toString().trim() || null,
      tierId: tier.id,
      planId: plan.id,
      tierName: tier.name,
      ticketPrice: tier.price,
      weeks: plan.weeks,
      downAmount: tier.downAmount,
      weeklyAmount: plan.weeklyAmount,
      totalAmount: total,
      status: "AWAITING_DOWNPAYMENT",
      installments: { create: installments },
    },
  });

  revalidatePath("/tickets");
  redirect(`/tickets?new=${order.id}`);
}
