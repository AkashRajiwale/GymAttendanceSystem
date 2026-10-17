import { body, cleanName, cleanPhone, fail, handle, requireMember } from "@/lib/api";
import { addAttendance, findOrCreateMember, listDay, newId } from "@/lib/db";
import { withFlags } from "@/lib/rules";
import { istParts } from "@/lib/time";

/** Check in someone who doesn't have their phone with them. Body: { name, phone } */
export const POST = handle(async (req: Request) => {
  const me = await requireMember();
  const b = await body(req);
  const phone = cleanPhone(b.phone);
  const name = cleanName(b.name);
  if (phone === me.phone) fail(400, "That's your own number — scan the QR to mark yourself");

  const nowMs = Date.now();
  const now = istParts(nowMs);
  const [member, day] = await Promise.all([findOrCreateMember(name, phone), listDay(now.date)]);
  if (day.some((a) => a.phone === phone && !a.outTime)) {
    fail(409, `${member.name} is already checked in`);
  }

  const stamp = new Date(nowMs).toISOString();
  const record = await addAttendance({
    id: newId(),
    date: now.date,
    phone,
    name: member.name,
    inTime: now.time,
    outTime: "",
    addedBy: me.phone,
    createdAt: stamp,
    updatedAt: stamp,
  });
  return { record: withFlags(record, nowMs) };
});
