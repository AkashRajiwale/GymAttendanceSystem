import { body, cleanPhone, fail, handle, requireAdmin } from "@/lib/api";
import { addPayment, coversMonth, deletePayment, listAttendance, listMembers, listPayments, newId } from "@/lib/db";
import { currentMonth, isDate, isMonth, monthSpan, today } from "@/lib/time";

/** Paid and not-paid members for a month. Bulk payments count for every month they cover. */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();
  if (!isMonth(month)) fail(400, "Invalid month");

  const [payments, members, visits] = await Promise.all([listPayments(), listMembers(), listAttendance(month)]);
  const covering = new Map(payments.filter((p) => coversMonth(p, month)).map((p) => [p.phone, p]));
  const visited = new Set(visits.map((v) => v.phone));
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  return {
    month,
    monthlyFee: Number(process.env.MONTHLY_FEE) || null,
    // Money actually received during this month (a bulk payment counts once, when it was paid).
    collected: payments.filter((p) => p.paidOn.startsWith(month)).reduce((sum, p) => sum + p.amount, 0),
    paid: members
      .filter((m) => covering.has(m.phone))
      .map((m) => ({ ...m, payment: covering.get(m.phone)! }))
      .sort(byName),
    unpaid: members
      .filter((m) => !covering.has(m.phone))
      .map((m) => ({ ...m, visitedThisMonth: visited.has(m.phone) }))
      // People who are actually coming to the gym this month first.
      .sort((a, b) => Number(b.visitedThisMonth) - Number(a.visitedThisMonth) || byName(a, b)),
  };
});

/** Body: { phone, fromMonth, toMonth, amount, mode?, paidOn?, note? } */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req);
  const phone = cleanPhone(b.phone);
  const member = (await listMembers()).find((m) => m.phone === phone) ?? fail(404, "No member with that phone number");
  if (!isMonth(b.fromMonth) || !isMonth(b.toMonth)) fail(400, "Pick the months this payment covers");
  const from = b.fromMonth as string;
  const to = b.toMonth as string;
  const span = monthSpan(from, to);
  if (span < 1) fail(400, "The last month must be after the first month");
  if (span > 12) fail(400, "A payment can cover at most 12 months");
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) fail(400, "Enter the amount paid");

  const payment = await addPayment({
    id: newId(),
    phone,
    name: member.name,
    month: from,
    toMonth: to,
    amount,
    paidOn: isDate(b.paidOn) ? b.paidOn : today(),
    mode: String(b.mode || "UPI").slice(0, 20),
    note: String(b.note ?? "").slice(0, 200),
    createdAt: new Date().toISOString(),
  });
  return { payment };
});

/** Undo paid: removes the whole payment, including every month it covered. */
export const DELETE = handle(async (req: Request) => {
  await requireAdmin();
  const { id } = await body(req);
  if (typeof id !== "string") fail(400, "Invalid request");
  await deletePayment(id as string);
});
