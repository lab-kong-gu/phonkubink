"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { markInstallmentPaidAndNotify } from "@/lib/paymentConfirm";
import { pushMessages, buildSlipRejectedMessage } from "@/lib/linePush";

// Admin manually confirms a slip submission that couldn't be auto-confirmed
// (ambiguous which installment, amount mismatch EasySlip flagged, or EasySlip
// couldn't read it at all) — admin picks the installment and the amount to
// credit, we run it through the same idempotent crediting path as the
// automatic flow.
export async function confirmSlipSubmission(formData: FormData) {
  await requireAdmin();
  const submissionId = (formData.get("submissionId") ?? "").toString();
  const installmentId = (formData.get("installmentId") ?? "").toString();
  const amount = parseFloat((formData.get("amount") ?? "").toString());

  const submission = await prisma.slipSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.status !== "PENDING_REVIEW") {
    revalidatePath("/admin/slips");
    return;
  }
  if (!installmentId || isNaN(amount) || amount <= 0) {
    revalidatePath("/admin/slips");
    return;
  }

  // Use EasySlip's transRef as the idempotency key when we have one (matches
  // the automatic path); otherwise a submission-scoped synthetic id still
  // guards against double-clicking Confirm.
  const chargeRef = submission.transRef ?? `manual-${submission.id}`;
  const credited = await markInstallmentPaidAndNotify(installmentId, chargeRef, amount);

  await prisma.slipSubmission.update({
    where: { id: submissionId },
    data: {
      installmentId,
      status: credited.ok ? "CONFIRMED" : "PENDING_REVIEW",
      note: credited.ok ? null : "บันทึกการชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      reviewedAt: credited.ok ? new Date() : null,
    },
  });

  revalidatePath("/admin/slips");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/tickets");
}

// Admin rejects a slip submission — customer gets a LINE message with the
// (optional) reason so they know to resend or contact support.
export async function rejectSlipSubmission(formData: FormData) {
  await requireAdmin();
  const submissionId = (formData.get("submissionId") ?? "").toString();
  const reason = (formData.get("reason") ?? "").toString().trim() || undefined;

  const submission = await prisma.slipSubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.status !== "PENDING_REVIEW") {
    revalidatePath("/admin/slips");
    return;
  }

  await prisma.slipSubmission.update({
    where: { id: submissionId },
    data: { status: "REJECTED", note: reason ?? submission.note, reviewedAt: new Date() },
  });

  await pushMessages(submission.lineUserId, [buildSlipRejectedMessage(reason)]);

  revalidatePath("/admin/slips");
}
