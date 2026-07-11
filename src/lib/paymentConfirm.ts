// Shared "credit a payment toward an installment" logic. No payment gateway
// and no automatic slip verification — customers transfer manually by
// PromptPay and send a slip photo in LINE chat; the ADMIN checks the slip by
// eye and confirms it with the "ยืนยันสลิป" button on the order
// (/admin/orders → confirmSlipPayment), which calls this function.
// Supports PARTIAL payments: a down payment can be settled in two slips
// (deposit, then the remainder).
//
// Idempotent via PaymentLog.gatewayChargeId (unique) — the "charge id" is a
// synthetic `manual-admin-{installmentId}-{paidSoFar}` id — if the same one
// is credited twice (e.g. a double-clicked admin confirm), the second
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

  // Auto-advance the booking flow when a slip lands on the down-payment
  // installment:
  //  - deposit confirmed (first money, while รอชำระมัดจำ) → รอส่งเอกสาร
  //  - down payment fully paid (while รอชำระเงินดาวน์)   → รอกดบัตร
  const justUnlockedDocs =
    installment.isDownPayment &&
    wasUnpaid &&
    (order.status === "AWAITING_DEPOSIT" || order.status === "PENDING");
  const downPaymentComplete =
    installment.isDownPayment &&
    isFullyPaid &&
    (order.status === "AWAITING_DOWNPAYMENT" || order.status === "DOCS_APPROVED");
  const newStatus = justUnlockedDocs ? "AWAITING_DOCS" : downPaymentComplete ? "AWAITING_TICKET" : null;
  if (newStatus) {
    await prisma.order.update({ where: { id: order.id }, data: { status: newStatus } });
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
  if (downPaymentComplete) {
    messages.push({
      type: "text",
      text: "ได้รับเงินดาวน์ครบแล้วค่ะ 🎉 ทางร้านจะดำเนินการกดบัตรให้เร็ว ๆ นี้ค่ะ",
    });
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
