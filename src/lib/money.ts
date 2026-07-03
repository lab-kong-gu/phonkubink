// Format a money value (Prisma.Decimal, number, or string) as baht.
export function baht(v: unknown): string {
  const n = parseFloat(String(v));
  return "฿" + (isNaN(n) ? "0" : n.toLocaleString("th-TH", { maximumFractionDigits: 2 }));
}

// total a plan costs = down + weekly * weeks
export function planTotal(down: unknown, weekly: unknown, weeks: number): number {
  return parseFloat(String(down)) + parseFloat(String(weekly)) * weeks;
}

// Fixed booking deposit (มัดจำ) — charged via PromptPay immediately after
// checkout, deducted from the down payment. Capped to the down payment
// amount itself for cheap tiers where the full down payment is < ฿300.
export const DEPOSIT_AMOUNT = 300;

export function depositAmountFor(downAmount: unknown): number {
  return Math.min(DEPOSIT_AMOUNT, parseFloat(String(downAmount)));
}

// How much is still owed on an installment (amount - amountPaid), floored at 0
// to guard against float/decimal rounding pushing it slightly negative.
export function remainingAmount(amount: unknown, amountPaid: unknown): number {
  const remaining = parseFloat(String(amount)) - parseFloat(String(amountPaid ?? 0));
  return Math.max(0, Math.round(remaining * 100) / 100);
}
