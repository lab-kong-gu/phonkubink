// Order booking-flow helpers. New flow: awaiting down-payment → awaiting docs → ticket issued.
// Legacy statuses (PENDING/CONFIRMED/COMPLETED) are mapped onto the same steps.

export function orderStatusLabel(s: string): { label: string; cls: string } {
  switch (s) {
    case "AWAITING_DOWNPAYMENT":
    case "PENDING":
      return { label: "รอชำระดาวน์", cls: "bg-violet-100 text-violet-700" };
    case "AWAITING_DOCS":
    case "CONFIRMED":
      return { label: "รอตรวจเอกสาร", cls: "bg-amber-100 text-amber-700" };
    case "TICKET_ISSUED":
    case "COMPLETED":
      return { label: "ออกบัตรแล้ว", cls: "bg-green-100 text-green-700" };
    case "CANCELLED":
      return { label: "ยกเลิก", cls: "bg-rose-100 text-rose-600" };
    default:
      return { label: s, cls: "bg-slate-100 text-slate-500" };
  }
}

// Next step in the flow, or null if there's nothing to advance to.
export function nextStatus(s: string): string | null {
  if (s === "AWAITING_DOWNPAYMENT" || s === "PENDING") return "AWAITING_DOCS";
  if (s === "AWAITING_DOCS" || s === "CONFIRMED") return "TICKET_ISSUED";
  return null;
}

// Label for the button that advances to the next step.
export function nextActionLabel(s: string): string | null {
  if (s === "AWAITING_DOWNPAYMENT" || s === "PENDING") return "ยืนยันรับเอกสาร";
  if (s === "AWAITING_DOCS" || s === "CONFIRMED") return "ออกบัตร";
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
