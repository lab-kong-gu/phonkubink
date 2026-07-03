// Shared "turn a plan + frequency into installment rows" logic — used by both
// createOrder (new booking) and updateOrderPlan (editing an unpaid booking's
// tier/plan from the Ticket History page) so the two never drift apart.
import { Prisma } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BuiltInstallment {
  weekNumber: number;
  isDownPayment: boolean;
  dueDate: Date;
  amount: Prisma.Decimal;
  status: "PENDING";
}

export function buildInstallments(opts: {
  downAmount: Prisma.Decimal.Value;
  weeklyAmount: Prisma.Decimal.Value;
  weeks: number;
  biweekly: boolean; // weekly (every 7 days) vs biweekly (every 15 days, 2 งวด at once)
}): { installments: BuiltInstallment[]; total: Prisma.Decimal } {
  const weekly = new Prisma.Decimal(opts.weeklyAmount);
  const down = new Prisma.Decimal(opts.downAmount);
  const total = down.plus(weekly.times(opts.weeks));

  const weeklyInstallments: BuiltInstallment[] = opts.biweekly
    ? Array.from({ length: Math.ceil(opts.weeks / 2) }, (_, i) => {
        const weeksThis = Math.min(2, opts.weeks - i * 2); // 2, or 1 for an odd last งวด
        return {
          weekNumber: i + 1,
          isDownPayment: false,
          dueDate: new Date(Date.now() + (i + 1) * 15 * DAY_MS),
          amount: weekly.times(weeksThis),
          status: "PENDING" as const,
        };
      })
    : Array.from({ length: opts.weeks }, (_, i) => ({
        weekNumber: i + 1,
        isDownPayment: false,
        dueDate: new Date(Date.now() + (i + 1) * 7 * DAY_MS),
        amount: weekly,
        status: "PENDING" as const,
      }));

  // The down payment is itself an Installment row (weekNumber 0, due immediately)
  // so it goes through the same transfer + slip-verification + push-notification pipeline.
  const downPaymentInstallment: BuiltInstallment = {
    weekNumber: 0,
    isDownPayment: true,
    dueDate: new Date(),
    amount: down,
    status: "PENDING",
  };

  return { installments: [downPaymentInstallment, ...weeklyInstallments], total };
}
