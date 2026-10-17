import { handle, requireMember } from "@/lib/api";
import { coversMonth, listPayments } from "@/lib/db";
import { addMonths, currentMonth } from "@/lib/time";

export const GET = handle(async () => {
  const member = await requireMember();
  const payments = (await listPayments())
    .filter((p) => p.phone === member.phone)
    .sort((a, b) => b.toMonth.localeCompare(a.toMonth) || b.paidOn.localeCompare(a.paidOn));
  const month = currentMonth();
  // Follow back-to-back payments forward to find the last month paid without a gap.
  let paidUntil: string | null = null;
  for (let m = month, p = payments.find((x) => coversMonth(x, m)); p; p = payments.find((x) => coversMonth(x, m))) {
    paidUntil = p.toMonth;
    m = addMonths(p.toMonth, 1);
  }
  return {
    month,
    paidThisMonth: !!paidUntil,
    paidUntil,
    monthlyFee: Number(process.env.MONTHLY_FEE) || null,
    payments,
  };
});
