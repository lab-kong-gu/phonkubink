// Order booking-flow helpers. Flow:
//   รอชำระมัดจำ (AWAITING_DEPOSIT)
//   → รอส่งเอกสาร (AWAITING_DOCS)            [deposit slip confirmed]
//   → รอชำระเงินดาวน์ (AWAITING_DOWNPAYMENT)  [admin approves docs]
//   → รอกดบัตร (AWAITING_TICKET)             [down payment fully paid]
//   → ออกบัตรแล้ว (TICKET_ISSUED)            [admin presses/issues the ticket]
// Legacy statuses (PENDING/CONFIRMED/COMPLETED/DOCS_APPROVED) map onto the same steps.

export function orderStatusLabel(s: string): { label: string; cls: string } {
  switch (s) {
    case "AWAITING_DEPOSIT":
    case "PENDING":
      return { label: "รอชำระมัดจำ", cls: "bg-violet-100 text-violet-700" };
    case "AWAITING_DOCS":
    case "CONFIRMED":
      return { label: "รอส่งเอกสาร", cls: "bg-amber-100 text-amber-700" };
    case "DOCS_REJECTED":
      return { label: "เอกสารไม่ผ่าน", cls: "bg-rose-100 text-rose-600" };
    case "AWAITING_DOWNPAYMENT":
    case "DOCS_APPROVED":
      return { label: "รอชำระเงินดาวน์", cls: "bg-sky-100 text-sky-700" };
    case "AWAITING_TICKET":
      return { label: "รอกดบัตร", cls: "bg-teal-100 text-teal-700" };
    case "TICKET_ISSUED":
    case "COMPLETED":
      return { label: "ออกบัตรแล้ว", cls: "bg-green-100 text-green-700" };
    case "CANCELLED":
      return { label: "ยกเลิก", cls: "bg-rose-100 text-rose-600" };
    default:
      return { label: s, cls: "bg-slate-100 text-slate-500" };
  }
}

// Single unambiguous next step for a generic admin "advance" button.
// AWAITING_DOCS / DOCS_REJECTED are NOT here — they branch via dedicated
// approve/reject/resubmit actions. The two payment steps auto-advance when
// EasySlip confirms a slip, but the admin can also advance them by hand as a
// fallback (e.g. if EasySlip can't read the slip).
export function nextStatus(s: string): string | null {
  if (s === "AWAITING_DEPOSIT" || s === "PENDING") return "AWAITING_DOCS";
  if (s === "AWAITING_DOWNPAYMENT" || s === "DOCS_APPROVED") return "AWAITING_TICKET";
  if (s === "AWAITING_TICKET") return "TICKET_ISSUED";
  return null;
}

export function nextActionLabel(s: string): string | null {
  if (s === "AWAITING_DEPOSIT" || s === "PENDING") return "ยืนยันมัดจำ";
  if (s === "AWAITING_DOWNPAYMENT" || s === "DOCS_APPROVED") return "ยืนยันเงินดาวน์";
  if (s === "AWAITING_TICKET") return "ออกบัตร";
  return null;
}

export function isIssued(s: string): boolean {
  return s === "TICKET_ISSUED" || s === "COMPLETED";
}
export function isCancelled(s: string): boolean {
  return s === "CANCELLED";
}
// "in progress" = not cancelled and not yet issued
export function isActive(s: string): boolean {
  return !isCancelled(s) && !isIssued(s);
}
export function isAwaitingDocsReview(s: string): boolean {
  return s === "AWAITING_DOCS" || s === "CONFIRMED";
}
export function isDocsRejected(s: string): boolean {
  return s === "DOCS_REJECTED";
}

// 4-step timeline: มัดจำ → เอกสาร → เงินดาวน์ → กดบัตร. Returns how many steps
// are done (0–4) and the label shown next to the dots.
export function orderTimeline(s: string): { done: number; label: string; cancelled?: boolean } {
  if (isCancelled(s)) return { done: 0, label: "ยกเลิกแล้ว", cancelled: true };
  if (isIssued(s)) return { done: 4, label: "ครบทุกขั้นตอน" };
  if (isDocsRejected(s)) return { done: 1, label: "เอกสารไม่ผ่าน · รอแก้ไข" };
  if (s === "AWAITING_TICKET") return { done: 3, label: "ถัดไป · กดบัตร" };
  if (s === "AWAITING_DOWNPAYMENT" || s === "DOCS_APPROVED") return { done: 2, label: "ถัดไป · ชำระเงินดาวน์" };
  if (isAwaitingDocsReview(s)) return { done: 1, label: "ถัดไป · ตรวจเอกสาร" };
  return { done: 0, label: "ถัดไป · ชำระมัดจำ" };
}
