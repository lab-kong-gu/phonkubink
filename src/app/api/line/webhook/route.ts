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
  replyMessages,
  pushMessages,
  downloadLineContent,
  buildSlipPendingReviewMessage,
} from "@/lib/linePush";
import { uploadSlip } from "@/lib/storage";
import { verifyBankSlipImage } from "@/lib/easyslip";
import { remainingAmount } from "@/lib/money";
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

  // Only customers we already know about (i.e. who've made at least one
  // order) can submit slips — a stranger just messaging the OA with a random
  // photo shouldn't create a database row.
  const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
  if (!user) return;

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
  } else if (candidates.length > 1) {
    note = `พบรายการค้างชำระหลายรายการ (${candidates.length} รายการ) ต้องเลือกด้วยตนเอง`;
  } else {
    const candidate = candidates[0];
    const amountDue = remainingAmount(candidate.amount, candidate.amountPaid);
    const result = await verifyBankSlipImage(content.buffer, content.contentType, {
      matchAmount: amountDue,
      checkDuplicate: true,
    });

    if (!result.ok) {
      note = `ตรวจสอบสลิปไม่สำเร็จ: ${result.message}`;
    } else {
      const d = result.data;
      transRef = d.rawSlip.transRef;
      amountInSlip = d.amountInSlip;
      isAmountMatched = d.isAmountMatched ?? null;
      isDuplicate = d.isDuplicate;
      installmentId = candidate.id;

      if (d.isAmountMatched && !d.isDuplicate) {
        status = "AUTO_CONFIRMED";
      } else {
        note = d.isDuplicate
          ? "สลิปนี้เคยถูกใช้ยืนยันการชำระเงินแล้ว"
          : `ยอดเงินในสลิป (${d.amountInSlip}) ไม่ตรงกับยอดที่ต้องชำระ (${amountDue})`;
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
    await pushMessages(userId, [buildSlipPendingReviewMessage()]);
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
      } else if (event.type === "message" && event.message?.type === "image" && event.message.id) {
        await handleSlipImage(userId, event.message.id);
      } else if (event.type === "message" && event.message?.type === "text" && event.replyToken) {
        await replyMessages(event.replyToken, [
          {
            type: "text",
            text: "ขอบคุณสำหรับข้อความค่ะ 🙏 ทีมงานผ่อนกับอิ้งจะติดต่อกลับโดยเร็วที่สุด\nดูสถานะบัตร/งวดผ่อนของคุณได้ที่เว็บไซต์เลยนะคะ",
          },
        ]);
      }
    } catch (err) {
      // Don't let one bad event fail the whole batch's 200 response.
      console.error("LINE webhook event error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
