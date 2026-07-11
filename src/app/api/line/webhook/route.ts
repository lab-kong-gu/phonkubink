// POST /api/line/webhook — LINE Messaging API webhook receiver.
// Configure in the LINE Developers Console: Messaging API channel → Webhook URL.
// Docs: https://developers.line.biz/en/docs/messaging-api/receiving-messages/
//
// Handles two things:
// 1. follow/unfollow — keeps User.isFriend in sync.
// 2. image messages — customers send a photo of their bank-transfer slip
//    here after paying manually (no payment gateway). The slip is stored for
//    reference and the customer gets an acknowledgement; the ADMIN verifies
//    the slip by eye in LINE chat and confirms it with the "ยืนยันสลิป"
//    button on the order in /admin/orders. (No automatic verification.)
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  pushMessages,
  downloadLineContent,
  buildSlipPendingReviewMessage,
} from "@/lib/linePush";
import { uploadSlip } from "@/lib/storage";

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
  // handler can take a couple of seconds (download + upload).
  const existing = await prisma.slipSubmission.findUnique({ where: { lineMessageId: messageId } });
  if (existing) return;

  // The caller has already confirmed this sender is a linked customer.
  const content = await downloadLineContent(messageId);
  if (!content) return; // couldn't fetch the image at all — nothing to record

  const imagePath = await uploadSlip(content.buffer, content.contentType);

  // Just keep a record — the admin checks the slip in LINE chat and presses
  // the confirm button on the order (/admin/orders) to credit the payment.
  await prisma.slipSubmission.create({
    data: {
      lineUserId: userId,
      lineMessageId: messageId,
      imagePath,
      status: "PENDING_REVIEW",
      note: "รอแอดมินตรวจสอบสลิปใน LINE แล้วกดยืนยันในหน้าออเดอร์",
    },
  });

  await pushMessages(userId, [buildSlipPendingReviewMessage()]);
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
