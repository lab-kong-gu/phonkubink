// POST /api/line/webhook — LINE Messaging API webhook receiver.
// Configure in the LINE Developers Console: Messaging API channel → Webhook URL.
// Docs: https://developers.line.biz/en/docs/messaging-api/receiving-messages/
//
// Handles two things:
// 1. follow/unfollow — keeps User.isFriend in sync.
// 2. image messages — customers send a photo of their bank-transfer slip
//    here after paying manually (no payment gateway). We verify it via
//    EasySlip and auto-confirm the payment when the amount matches; anything
//    ambiguous or mismatched goes to the admin review queue (/admin/slips).
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  pushMessages,
  downloadLineContent,
  buildSlipPendingReviewMessage,
  buildSlipDuplicateMessage,
} from "@/lib/linePush";
import { uploadSlip } from "@/lib/storage";
import { verifyBankSlipImage } from "@/lib/easyslip";
import { remainingAmount, depositAmountFor } from "@/lib/money";
import { markInstallmentPaidAndNotify } from "@/lib/paymentConfirm";

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { id: string; type: string; text?: string };
}

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleSlipImage(userId: string, messageId: string) {
  // Redelivery guard — LINE retries webhooks that don't 200 quickly, and this
  // handler can take a couple of seconds (download + upload + EasySlip call).
  const existing = await prisma.slipSubmission.findUnique({ where: { lineMessageId: messageId } });
  if (existing) return;

  // The caller has already confirmed this sender is a linked customer.
  const content = await downloadLineContent(messageId);
  if (!content) return; // couldn't fetch the image at all — nothing to record

  const imagePath = await uploadSlip(content.buffer, content.contentType);

  const candidates = await prisma.installment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      order: { lineUserId: userId, status: { notIn: ["CANCELLED", "TICKET_ISSUED", "COMPLETED"] } },
    },
    orderBy: { dueDate: "asc" },
  });

  let installmentId: string | null = null;
  let transRef: string | null = null;
  let amountInSlip: number | null = null;
  let isAmountMatched: boolean | null = null;
  let isDuplicate: boolean | null = null;
  let note: string | null = null;
  let status: "PENDING_REVIEW" | "AUTO_CONFIRMED" = "PENDING_REVIEW";

  if (candidates.length === 0) {
    note = "ไม่พบรายการค้างชำระของลูกค้ารายนี้";
  } else {
    // Verify the slip once to read the actual transferred amount and dedupe.
    // We do our OWN amount matching below (against each open installment's
    // remaining balance) instead of relying on EasySlip's matchAmount, because
    // there's usually more than one open งวด and we don't know up front which
    // one the customer paid — the slip amount tells us.
    const result = await verifyBankSlipImage(content.buffer, content.contentType, {
      checkDuplicate: true,
    });

    if (!result.ok) {
      note = `ตรวจสอบสลิปไม่สำเร็จ: ${result.message}`;
    } else {
      const d = result.data;
      transRef = d.rawSlip.transRef;
      amountInSlip = d.amountInSlip;
      isDuplicate = d.isDuplicate;

      if (d.isDuplicate) {
        isAmountMatched = null;
        note = "สลิปนี้เคยถูกใช้ยืนยันการชำระเงินแล้ว";
      } else {
        // Find an open installment the slip amount can settle. candidates are
        // ordered by dueDate asc, so when several งวด share the same amount we
        // credit the earliest-due one — the natural "pay off oldest first".
        // A match is either (a) the exact remaining balance, or (b) the fixed
        // ฿300 booking deposit on a not-yet-touched down payment (a deliberate
        // partial payment — markInstallmentPaidAndNotify handles PARTIAL).
        const paid = amountInSlip!;
        const match = candidates.find((c) => {
          if (Math.abs(remainingAmount(c.amount, c.amountPaid) - paid) < 0.01) return true;
          if (c.isDownPayment && parseFloat(String(c.amountPaid)) <= 0) {
            return Math.abs(depositAmountFor(c.amount) - paid) < 0.01;
          }
          return false;
        });
        if (match) {
          installmentId = match.id;
          isAmountMatched = true;
          status = "AUTO_CONFIRMED";
        } else {
          // Amount doesn't match any single งวด (partial payment, paying several
          // งวด at once, over/underpaid, etc.) — can't safely auto-credit, so
          // send it to the admin queue where the installment can be picked by hand.
          isAmountMatched = false;
          note = `ยอดเงินในสลิป (${amountInSlip}) ไม่ตรงกับยอดคงเหลือของงวดใด (มี ${candidates.length} รายการค้างชำระ)`;
        }
      }
    }
  }

  if (status === "AUTO_CONFIRMED" && installmentId && transRef && amountInSlip !== null) {
    const credited = await markInstallmentPaidAndNotify(installmentId, transRef, amountInSlip);
    if (!credited.ok) {
      status = "PENDING_REVIEW";
      note = "ไม่สามารถบันทึกการชำระเงินอัตโนมัติได้ กรุณาตรวจสอบด้วยตนเอง";
    }
  }

  await prisma.slipSubmission.create({
    data: {
      lineUserId: userId,
      installmentId,
      lineMessageId: messageId,
      imagePath,
      transRef,
      amountInSlip,
      isAmountMatched,
      isDuplicate,
      status,
      note,
    },
  });

  if (status !== "AUTO_CONFIRMED") {
    await pushMessages(userId, [
      isDuplicate ? buildSlipDuplicateMessage() : buildSlipPendingReviewMessage(amountInSlip),
    ]);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { events } = JSON.parse(rawBody) as { events: LineEvent[] };

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    try {
      if (event.type === "follow") {
        await prisma.user.updateMany({ where: { lineUserId: userId }, data: { isFriend: true } });
      } else if (event.type === "unfollow") {
        await prisma.user.updateMany({ where: { lineUserId: userId }, data: { isFriend: false } });
      } else if (event.type === "message") {
        // Only respond to senders whose LINE account is linked to a customer
        // record (created when they log in via LINE). Unknown senders get no
        // reply at all — and normal text messages get no auto-reply either;
        // a human handles chat manually.
        const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
        if (!user) continue;
        if (event.message?.type === "image" && event.message.id) {
          await handleSlipImage(userId, event.message.id);
        }
      }
    } catch (err) {
      // Don't let one bad event fail the whole batch's 200 response.
      console.error("LINE webhook event error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
