import { handle, requireMember } from "@/lib/api";
import { listPayments } from "@/lib/db";
import { currentMonth } from "@/lib/time";

export const GET = handle(async () => {
  const member = await requireMember();
  const payments = (await listPayments())
    .filter((p) => p.phone === member.phone)
    .sort((a, b) => b.month.localeCompare(a.month) || b.paidOn.localeCompare(a.paidOn));
  const month = currentMonth();
  return {
    month,
    paidThisMonth: payments.some((p) => p.month === month),
    monthlyFee: Number(process.env.MONTHLY_FEE) || null,
    payments,
  };
});
