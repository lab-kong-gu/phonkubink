// Shared "credit a payment toward an installment" logic. No payment gateway
// is involved anymore (Phase 4.2) — customers transfer manually by PromptPay
// and send a slip photo in LINE chat, which gets verified via EasySlip (see
// the image-message handling in src/app/api/line/webhook/route.ts) and
// either auto-confirmed or routed to the admin review queue (/admin/slips,
// src/app/admin/slips/actions.ts). Both paths call this same function.
// Supports PARTIAL payments: a down payment can be settled in two slips
// (deposit, then the remainder).
//
// Idempotent via PaymentLog.gatewayChargeId (unique) — the "charge id" is
// now EasySlip's transRef (or a synthetic `manual-{submissionId}` id when
// EasySlip couldn't read one) — if the same one is credited twice (e.g. a
// re-processed LINE webhook, or a double-clicked admin confirm), the second
// attempt is a no-op.

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { remainingAmount } from "@/lib/money";
import { pushMessages, buildReceiptFlex, buildSendDocsMessage } from "@/lib/linePush";

export async function markInstallmentPaidAndNotify(
  installmentId: string,
  chargeId: string,
  chargeAmountBaht: number
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: { order: { include: { concert: true } } },
  });
  if (!installment) return { ok: false };
  if (installment.status === "PAID") return { ok: true, alreadyPaid: true };

  const order = installment.order;

  // Idempotency guard: recording this charge id fails (unique constraint) if
  // it was already credited, which tells us to stop here.
  try {
    await prisma.paymentLog.create({
      data: { installmentId, gatewayChargeId: chargeId, amount: chargeAmountBaht },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: true, alreadyPaid: true }; // this exact charge was already processed
    }
    throw err;
  }

  const wasUnpaid = parseFloat(String(installment.amountPaid)) <= 0;
  const newAmountPaid = parseFloat(String(installment.amountPaid)) + chargeAmountBaht;
  const totalAmount = parseFloat(String(installment.amount));
  const isFullyPaid = newAmountPaid >= totalAmount - 0.001;

  const updated = await prisma.installment.update({
    where: { id: installmentId },
    data: {
      amountPaid: newAmountPaid,
      status: isFullyPaid ? "PAID" : "PARTIAL",
      paidAt: isFullyPaid ? new Date() : installment.paidAt,
      gatewayChargeId: chargeId,
    },
  });

  // Auto-advance the order past the down-payment step as soon as ANY money
  // (deposit or full) lands on the down-payment installment — admin still
  // manually reviews docs + issues the ticket afterwards.
  const justUnlockedDocs =
    installment.isDownPayment &&
    wasUnpaid &&
    (order.status === "AWAITING_DOWNPAYMENT" || order.status === "PENDING");
  if (justUnlockedDocs) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "AWAITING_DOCS" } });
  }

  const remainingInstallments = await prisma.installment.findMany({
    where: { orderId: order.id, status: { not: "PAID" } },
  });
  const remainingTotal = remainingInstallments.reduce(
    (sum, i) => sum + remainingAmount(i.amount, i.amountPaid),
    0
  );

  const orderInfo = {
    id: order.id,
    tierName: order.tierName,
    concertName: order.concert?.name ?? "",
    totalAmount: order.totalAmount,
  };
  const instInfo = {
    id: updated.id,
    weekNumber: updated.weekNumber,
    isDownPayment: updated.isDownPayment,
    amount: updated.amount,
    amountPaid: updated.amountPaid,
    dueDate: updated.dueDate,
  };

  const messages = [
    buildReceiptFlex(orderInfo, instInfo, chargeAmountBaht, {
      count: remainingInstallments.length,
      total: remainingTotal,
    }),
  ];
  if (justUnlockedDocs) {
    messages.push(buildSendDocsMessage());
  }
  if (remainingInstallments.length === 0) {
    messages.push({
      type: "text",
      text: `ชำระเงินครบทุกงวดแล้วสำหรับ ${orderInfo.concertName} 🎉 ทีมงานกำลังตรวจสอบเอกสารและจะออกบัตรให้เร็ว ๆ นี้ค่ะ`,
    });
  }
  await pushMessages(order.lineUserId, messages);

  revalidatePath("/tickets");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return { ok: true };
}
