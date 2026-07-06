// GET /api/cron/reminders — runs daily (see vercel.json) to push a LINE
// reminder for installments due within the next 2 days that haven't been
// reminded yet. Protected by CRON_SECRET so it can't be triggered publicly.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessages, buildReminderFlex } from "@/lib/linePush";
import { remainingAmount } from "@/lib/money";

const DAY_MS = 24 * 60 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 2 * DAY_MS);
  const windowStart = new Date(now.getTime() - 3 * DAY_MS); // also catch slightly-overdue ones

  const due = await prisma.installment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      reminderSentAt: null,
      dueDate: { gte: windowStart, lte: windowEnd },
      order: { status: { notIn: ["CANCELLED"] } },
      // The weekly installment plan only starts once the ticket is issued, so
      // don't remind about งวด before then — only the down payment (which is
      // due upfront) can be reminded on a not-yet-issued order.
      OR: [
        { isDownPayment: true },
        { order: { status: { in: ["TICKET_ISSUED", "COMPLETED"] } } },
      ],
    },
    include: { order: { include: { concert: true } } },
  });

  let sent = 0;
  for (const inst of due) {
    const order = inst.order;
    try {
      await pushMessages(order.lineUserId, [
        buildReminderFlex(
          { id: order.id, tierName: order.tierName, concertName: order.concert.name, totalAmount: order.totalAmount },
          {
            id: inst.id,
            weekNumber: inst.weekNumber,
            isDownPayment: inst.isDownPayment,
            amount: remainingAmount(inst.amount, inst.amountPaid),
            dueDate: inst.dueDate,
          }
        ),
      ]);
      await prisma.installment.update({ where: { id: inst.id }, data: { reminderSentAt: now } });
      sent++;
    } catch (err) {
      console.error(`Reminder push failed for installment ${inst.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
