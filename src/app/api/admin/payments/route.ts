import { body, cleanPhone, fail, handle, requireAdmin } from "@/lib/api";
import { addPayment, deletePayment, listAttendance, listMembers, listPayments, newId } from "@/lib/db";
import { currentMonth, isDate, isMonth, today } from "@/lib/time";

/** Payments for a month, plus members who haven't paid for it yet. */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();
  if (!isMonth(month)) fail(400, "Invalid month");

  const [payments, members, visits] = await Promise.all([listPayments(), listMembers(), listAttendance(month)]);
  const forMonth = payments.filter((p) => p.month === month).sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  const paid = new Set(forMonth.map((p) => p.phone));
  const visitedThisMonth = new Set(visits.map((v) => v.phone));

  return {
    month,
    monthlyFee: Number(process.env.MONTHLY_FEE) || null,
    payments: forMonth,
    total: forMonth.reduce((sum, p) => sum + p.amount, 0),
    unpaid: members
      .filter((m) => !paid.has(m.phone))
      .map((m) => ({ ...m, visitedThisMonth: visitedThisMonth.has(m.phone) }))
      .sort((a, b) => Number(b.visitedThisMonth) - Number(a.visitedThisMonth) || a.name.localeCompare(b.name)),
  };
});

/** Body: { phone, month, amount, paidOn, mode, note } */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req);
  const phone = cleanPhone(b.phone);
  const member = (await listMembers()).find((m) => m.phone === phone);
  if (!member) fail(404, "No member with that phone number");
  if (!isMonth(b.month)) fail(400, "Pick the month this fee is for");
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) fail(400, "Enter the amount paid");
  const paidOn = isDate(b.paidOn) ? b.paidOn : today();

  const payment = await addPayment({
    id: newId(),
    phone,
    name: member!.name,
    month: b.month as string,
    amount,
    paidOn,
    mode: String(b.mode || "UPI").slice(0, 20),
    note: String(b.note ?? "").slice(0, 200),
    createdAt: new Date().toISOString(),
  });
  return { payment };
});

export const DELETE = handle(async (req: Request) => {
  await requireAdmin();
  const { id } = await body(req);
  if (typeof id !== "string") fail(400, "Invalid request");
  await deletePayment(id as string);
});
