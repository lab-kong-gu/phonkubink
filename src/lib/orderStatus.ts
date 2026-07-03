// Order booking-flow helpers. New flow:
// awaiting down-payment → awaiting docs → (admin reviews) → docs approved/rejected → ticket issued.
// Legacy statuses (PENDING/CONFIRMED/COMPLETED) are mapped onto the same steps.

export function orderStatusLabel(s: string): { label: string; cls: string } {
  switch (s) {
    case "AWAITING_DOWNPAYMENT":
    case "PENDING":
      return { label: "รอชำระดาวน์", cls: "bg-violet-100 text-violet-700" };
    case "AWAITING_DOCS":
    case "CONFIRMED":
      return { label: "รอตรวจเอกสาร", cls: "bg-amber-100 text-amber-700" };
    case "DOCS_APPROVED":
      return { label: "เอกสารผ่าน", cls: "bg-teal-100 text-teal-700" };
    case "DOCS_REJECTED":
      return { label: "เอกสารไม่ผ่าน", cls: "bg-rose-100 text-rose-600" };
    case "TICKET_ISSUED":
    case "COMPLETED":
      return { label: "ออกบัตรแล้ว", cls: "bg-green-100 text-green-700" };
    case "CANCELLED":
      return { label: "ยกเลิก", cls: "bg-rose-100 text-rose-600" };
    default:
      return { label: s, cls: "bg-slate-100 text-slate-500" };
  }
}

// Next step in the flow, or null if there's nothing to auto-advance to.
// AWAITING_DOCS and DOCS_REJECTED are NOT handled here — they branch into two
// outcomes (approve/reject, or resubmit) via dedicated admin actions instead
// of a single generic "next" button. See approveDocsOrder/rejectDocsOrder/resubmitDocsOrder.
export function nextStatus(s: string): string | null {
  if (s === "AWAITING_DOWNPAYMENT" || s === "PENDING") return "AWAITING_DOCS";
  if (s === "DOCS_APPROVED") return "TICKET_ISSUED";
  return null;
}

// Label for the button that advances to the next step (only for statuses with
// a single unambiguous next step — see nextStatus).
export function nextActionLabel(s: string): string | null {
  if (s === "AWAITING_DOWNPAYMENT" || s === "PENDING") return "ยืนยันรับเอกสาร";
  if (s === "DOCS_APPROVED") return "ออกบัตร";
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
