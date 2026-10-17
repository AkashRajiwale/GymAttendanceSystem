import { body, fail, handle, requireMember } from "@/lib/api";
import { findAttendance, saveAttendance } from "@/lib/db";
import { checkInTime, checkOutTime, withFlags } from "@/lib/rules";
import { isDate, isTime, istParts } from "@/lib/time";

/**
 * Edit the in time or set/edit the out time of a visit.
 * Members can edit their own visits and visits they added for others.
 * Body: { date, id, inTime?, outTime? | "now" }
 */
export const PATCH = handle(async (req: Request) => {
  const member = await requireMember();
  const b = await body(req);
  if (!isDate(b.date) || typeof b.id !== "string") fail(400, "Invalid request");

  const record = await findAttendance(b.date as string, b.id as string);
  if (!record) return fail(404, "Attendance not found");
  if (record.phone !== member.phone && record.addedBy !== member.phone) fail(403, "Not your attendance");

  const now = Date.now();
  if (b.inTime !== undefined) {
    if (!isTime(b.inTime)) fail(400, "Pick a valid in time");
    const err = checkInTime(record, b.inTime as string, now);
    if (err) fail(400, err);
    record.inTime = b.inTime as string;
  }
  if (b.outTime !== undefined) {
    const outTime = b.outTime === "now" ? istParts(now).time : b.outTime;
    if (!isTime(outTime)) fail(400, "Pick a valid out time");
    const err = checkOutTime(record, outTime as string, now);
    if (err) fail(400, err);
    record.outTime = outTime as string;
  }

  await saveAttendance(record);
  return { record: withFlags(record, now) };
});
