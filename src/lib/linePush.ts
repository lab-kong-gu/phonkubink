// LINE Messaging API — push messages (bills / receipts / reminders).
// Docs: https://developers.line.biz/en/reference/messaging-api/#send-push-message

import { baht } from "@/lib/money";
import { fmtDate } from "@/lib/format";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

// LINE flex messages don't have a strict TS type in this project — keep it loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LineMessage = any;

async function callMessagingApi(url: string, body: object) {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not set — skipping push");
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Never throw — a failed push shouldn't roll back a payment/order transaction.
    console.error(`LINE messaging API error (${res.status}):`, await res.text());
  }
}

export async function pushMessages(to: string, messages: LineMessage[]): Promise<void> {
  if (!messages.length) return;
  await callMessagingApi(PUSH_URL, { to, messages: messages.slice(0, 5) });
}

export async function replyMessages(replyToken: string, messages: LineMessage[]): Promise<void> {
  if (!messages.length) return;
  await callMessagingApi(REPLY_URL, { replyToken, messages: messages.slice(0, 5) });
}

// Download the binary content of an image (or other media) message a user
// sent in chat — used to pull down transfer-slip photos for verification.
// Docs: https://developers.line.biz/en/reference/messaging-api/#get-content
export async function downloadLineContent(
  messageId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN is not set — cannot download content");
    return null;
  }
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`LINE content download error (${res.status}):`, await res.text());
    return null;
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

// ── shared bits ─────────────────────────────────────────────────────────

const BRAND_PINK = "#EC4899";
const BRAND_NAVY = "#1E2A4A";

function bubble(opts: {
  header: string;
  headerColor: string;
  title: string;
  rows: { label: string; value: string }[];
  footerButton?: { label: string; uri: string };
  footerNote?: string;
}): LineMessage {
  const body: LineMessage = {
    type: "box",
    layout: "vertical",
    spacing: "md",
    contents: [
      { type: "text", text: opts.title, weight: "bold", size: "lg", wrap: true, color: BRAND_NAVY },
      { type: "separator", margin: "md" },
      {
        type: "box",
        layout: "vertical",
        margin: "md",
        spacing: "sm",
        contents: opts.rows.map((r) => ({
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: r.label, size: "sm", color: "#6B7280", flex: 3 },
            { type: "text", text: r.value, size: "sm", color: BRAND_NAVY, flex: 5, wrap: true, align: "end" },
          ],
        })),
      },
    ],
  };

  const footerContents: LineMessage[] = [];
  if (opts.footerButton) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: BRAND_PINK,
      action: { type: "uri", label: opts.footerButton.label, uri: opts.footerButton.uri },
    });
  }
  if (opts.footerNote) {
    footerContents.push({ type: "text", text: opts.footerNote, size: "xs", color: "#9CA3AF", wrap: true, margin: "sm" });
  }

  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: opts.headerColor,
        paddingAll: "md",
        contents: [{ type: "text", text: opts.header, color: "#FFFFFF", weight: "bold", size: "sm" }],
      },
      body,
      footer: footerContents.length
        ? { type: "box", layout: "vertical", spacing: "sm", contents: footerContents }
        : undefined,
    },
  };
}

export interface PushOrderInfo {
  id: string;
  tierName: string;
  concertName: string;
  totalAmount: unknown;
}

export interface PushInstallmentInfo {
  id: string;
  weekNumber: number;
  isDownPayment: boolean;
  amount: unknown;
  amountPaid?: unknown;
  dueDate: Date;
}

function installmentLabel(inst: PushInstallmentInfo): string {
  return inst.isDownPayment ? "เงินดาวน์" : `งวดที่ ${inst.weekNumber}`;
}

// There's no web pay page — the customer transfers manually and sends a slip
// photo in chat. These rows list the business's receiving accounts (there can
// be several — different banks / PromptPay) right in the invoice/reminder bubble
// so the customer can pick one and copy the number. Returns [] if unconfigured.
//
// Configured via the BUSINESS_BANK_ACCOUNTS env var: one account per line (or
// separated by ";"), each as "Bank | Account number | Holder name" (the "|"
// parts are optional — holder can be omitted). Examples:
//   ไทยพาณิชย์ | 123-4-56789-0 | น.ส. อิ้ง
//   พร้อมเพย์ | 081-234-5678
function accountRows(): { label: string; value: string }[] {
  const raw = process.env.BUSINESS_BANK_ACCOUNTS;
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[;\n]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [bank, number, holder] = line.split("|").map((p) => p.trim());
      if (!number) {
        // No "|" delimiter — show the whole line as the value under a generic label.
        return { label: "โอนได้ที่", value: bank };
      }
      return { label: bank || "โอนได้ที่", value: holder ? `${number}\n${holder}` : number };
    });
}

const SLIP_NOTE = "โอนแล้วส่งรูปสลิปกลับมาในแชทนี้เพื่อยืนยันการชำระเงินได้เลยครับ 🙏";

// New order created → invoice for the deposit (มัดจำ). The customer transfers
// manually to the PromptPay account shown and sends a slip photo in chat.
// The deposit is a slice of the down payment — the rest is collected later.
export function buildDepositInvoiceFlex(
  order: PushOrderInfo,
  depositAmount: unknown,
  downPaymentTotal: unknown
): LineMessage {
  return bubble({
    header: "ใบแจ้งชำระมัดจำ · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: BRAND_NAVY,
    title: `จองบัตร ${order.concertName} สำเร็จ 🎫`,
    rows: [
      { label: "โซน", value: order.tierName },
      { label: "มัดจำ (ชำระตอนนี้)", value: baht(depositAmount) },
      { label: "เงินดาวน์ทั้งหมด", value: baht(downPaymentTotal) },
      ...accountRows(),
    ],
    footerNote: `${SLIP_NOTE} ส่วนที่เหลือของเงินดาวน์ชำระภายหลัง`,
  });
}

// Order plan changed after the deposit (or more) was already paid — shows
// how much of the already-paid money carried over and what (if anything)
// is still owed on the down payment under the new plan.
export function buildPlanUpdatedFlex(
  order: PushOrderInfo,
  alreadyPaid: unknown,
  newDownPaymentTotal: unknown,
  remainingDownPayment: unknown
): LineMessage {
  const rows = [
    { label: "โซน/แผนใหม่", value: order.tierName },
    { label: "ยกยอดที่จ่ายแล้วมาให้", value: baht(alreadyPaid) },
    { label: "เงินดาวน์ใหม่ทั้งหมด", value: baht(newDownPaymentTotal) },
  ];
  const remaining = parseFloat(String(remainingDownPayment));
  if (remaining > 0.001) {
    rows.push({ label: "ดาวน์คงเหลือที่ต้องชำระ", value: baht(remainingDownPayment) });
    rows.push(...accountRows());
  } else {
    rows.push({ label: "สถานะดาวน์", value: "ครบแล้ว ✅ ไม่ต้องชำระเพิ่ม" });
  }
  return bubble({
    header: "อัปเดตแผนผ่อน · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: BRAND_NAVY,
    title: `เปลี่ยนแผนผ่อนสำหรับ ${order.concertName}`,
    rows,
    footerNote: remaining > 0.001 ? SLIP_NOTE : undefined,
  });
}

// Reminder — installment coming due soon.
export function buildReminderFlex(order: PushOrderInfo, inst: PushInstallmentInfo): LineMessage {
  return bubble({
    header: "แจ้งเตือนครบกำหนดชำระ",
    headerColor: BRAND_PINK,
    title: `ใกล้ครบกำหนดชำระ — ${order.concertName}`,
    rows: [
      { label: "รายการ", value: installmentLabel(inst) },
      { label: "ยอดที่ต้องชำระ", value: baht(inst.amount) },
      { label: "ครบกำหนด", value: fmtDate(inst.dueDate) },
      ...accountRows(),
    ],
    footerNote: SLIP_NOTE,
  });
}

// Payment confirmed — receipt. `paidNow` is the amount this specific charge
// credited (may be less than inst.amount for a deposit / partial payment).
export function buildReceiptFlex(
  order: PushOrderInfo,
  inst: PushInstallmentInfo,
  paidNow: unknown,
  remaining: { count: number; total: unknown }
): LineMessage {
  const rows = [
    { label: "รายการ", value: installmentLabel(inst) },
    { label: "จำนวนเงินที่ชำระ", value: baht(paidNow) },
  ];

  const balanceOnThisItem =
    inst.amountPaid !== undefined ? parseFloat(String(inst.amount)) - parseFloat(String(inst.amountPaid)) : 0;
  if (balanceOnThisItem > 0.001) {
    rows.push({ label: "สถานะ", value: "ชำระมัดจำสำเร็จ ✅" });
    rows.push({ label: "คงเหลือรายการนี้", value: baht(balanceOnThisItem) });
  } else {
    rows.push({ label: "สถานะ", value: "ชำระเงินสำเร็จ ✅" });
  }

  if (remaining.count > 0) {
    rows.push({ label: "งวดที่เหลือทั้งหมด", value: `${remaining.count} รายการ (${baht(remaining.total)})` });
  } else {
    rows.push({ label: "คงเหลือทั้งหมด", value: "ชำระครบแล้ว 🎉" });
  }

  return bubble({
    header: "ใบเสร็จรับเงิน · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: "#16A34A",
    title: `ได้รับชำระเงินแล้ว — ${order.concertName}`,
    rows,
  });
}

// Sent alongside the receipt once the down payment (or its deposit) is paid —
// tells the customer they can now submit their ID/documents for review.
export function buildSendDocsMessage(): LineMessage {
  return { type: "text", text: "ส่งเอกสารได้เลยครับลูกค้า" };
}

// Admin approved the documents. Next step: the customer pays the remaining
// down payment (เงินดาวน์) — so this prompts that payment with the amount +
// account details. If nothing's left on the down payment, it just says รอกดบัตร.
export function buildDocsApprovedFlex(order: PushOrderInfo, remainingDown: number): LineMessage {
  const needsPayment = remainingDown > 0.001;
  const rows: { label: string; value: string }[] = [{ label: "โซน", value: order.tierName }];
  if (needsPayment) {
    rows.push({ label: "เงินดาวน์คงเหลือ", value: baht(remainingDown) });
    rows.push(...accountRows());
  } else {
    rows.push({ label: "สถานะ", value: "รอกดบัตร" });
  }
  return bubble({
    header: "ตรวจเอกสารแล้ว · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: "#0D9488",
    title: `เอกสารผ่าน — ${order.concertName} ✅`,
    rows,
    footerNote: needsPayment ? SLIP_NOTE : "ทางร้านจะดำเนินการกดบัตรให้ในลำดับถัดไปครับ",
  });
}

// Admin rejected the submitted documents — reason is admin-filled free text
// explaining what's missing/needs correcting.
export function buildDocsRejectedFlex(order: PushOrderInfo, reason: string): LineMessage {
  return bubble({
    header: "ตรวจเอกสารแล้ว · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: "#E11D48",
    title: `เอกสารไม่ผ่าน — ${order.concertName}`,
    rows: [
      { label: "โซน", value: order.tierName },
      { label: "เหตุผล", value: reason },
    ],
    footerNote: "กรุณาส่งเอกสารใหม่ตามที่แจ้งครับลูกค้า",
  });
}

// Slip photo received, but couldn't be auto-confirmed (amount mismatch,
// unreadable QR, duplicate, ambiguous which installment it's for, etc.) —
// a styled bubble (amber "under review" header, same look as the receipt)
// that confirms the amount we read (when available) and says a human will
// follow up, so the customer never wonders whether the transfer went through.
export function buildSlipPendingReviewMessage(amountInSlip?: number | null): LineMessage {
  const rows: { label: string; value: string }[] = [];
  if (amountInSlip != null) {
    rows.push({ label: "ยอดในสลิป", value: baht(amountInSlip) });
  }
  rows.push({ label: "สถานะ", value: "กำลังตรวจสอบ" });
  return bubble({
    header: "ได้รับสลิปแล้ว · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: "#D97706",
    title: "ได้รับสลิปของคุณแล้ว 🙏",
    rows,
    footerNote: "ทีมงานกำลังตรวจสอบยอดเงิน และจะแจ้งผลให้ทราบอีกครั้งค่ะ",
  });
}

// Slip is a duplicate of one already used to confirm a payment — reassure the
// customer that the transfer was already received (no action needed), rather
// than making it look like something's wrong.
export function buildSlipDuplicateMessage(): LineMessage {
  return bubble({
    header: "สลิปซ้ำ · ผ่อนบัตรร้านอิ๊งค์",
    headerColor: "#0D9488",
    title: "สลิปซ้ำ ทางร้านรับยอดโอนแล้วครับลูกค้า",
    rows: [{ label: "สถานะ", value: "รับยอดโอนแล้ว ✅" }],
  });
}

// Admin rejected a slip submission (couldn't verify it / amount didn't
// match / etc.) — reason is whatever the admin typed, or a generic fallback.
export function buildSlipRejectedMessage(reason?: string): LineMessage {
  return {
    type: "text",
    text: `สลิปที่ส่งมายังไม่สามารถยืนยันได้ค่ะ${reason ? `\nเหตุผล: ${reason}` : ""}\nกรุณาตรวจสอบยอดโอนอีกครั้ง หรือส่งสลิปใหม่ค่ะ`,
  };
}

// Admin issues the ticket — final receipt / confirmation.
export function buildTicketIssuedFlex(order: PushOrderInfo): LineMessage {
  return bubble({
    header: "ออกบัตรเรียบร้อย",
    headerColor: "#16A34A",
    title: `บัตร ${order.concertName} ของคุณพร้อมแล้ว 🎉`,
    rows: [
      { label: "โซน", value: order.tierName },
      { label: "ยอดรวม", value: baht(order.totalAmount) },
      { label: "สถานะ", value: "ออกบัตรแล้ว" },
    ],
    footerNote: "ตรวจสอบรายละเอียดบัตรได้ที่หน้าตั๋วของฉันในเว็บไซต์",
  });
}
