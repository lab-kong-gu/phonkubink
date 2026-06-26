// Format a money value (Prisma.Decimal, number, or string) as baht.
export function baht(v: unknown): string {
  const n = parseFloat(String(v));
  return "฿" + (isNaN(n) ? "0" : n.toLocaleString("th-TH", { maximumFractionDigits: 2 }));
}

// total a plan costs = down + weekly * weeks
export function planTotal(down: unknown, weekly: unknown, weeks: number): number {
  return parseFloat(String(down)) + parseFloat(String(weekly)) * weeks;
}
