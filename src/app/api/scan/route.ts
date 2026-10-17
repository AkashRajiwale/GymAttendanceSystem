import { body, fail, handle, requireMember } from "@/lib/api";
import { addAttendance, listDay, newId, saveAttendance } from "@/lib/db";
import { DOUBLE_SCAN_GUARD, withFlags } from "@/lib/rules";
import { istParts } from "@/lib/time";

/**
 * Called when a member scans the gym QR.
 * No open visit today -> check in. Open visit -> check out.
 */
export const POST = handle(async (req: Request) => {
  const key = process.env.GYM_QR_KEY;
  const b = await body(req);
  if (key && b.k !== key) fail(403, "This QR code is not valid. Please scan the QR at the gym.");

  const member = await requireMember();
  const nowMs = Date.now();
  const now = istParts(nowMs);
  const day = await listDay(now.date);
  const open = day
    .filter((a) => a.phone === member.phone && !a.outTime)
    .sort((x, y) => x.createdAt.localeCompare(y.createdAt))
    .pop();

  if (open) {
    if (nowMs - Date.parse(open.createdAt) < DOUBLE_SCAN_GUARD) {
      return { status: "already-in", record: withFlags(open, nowMs) };
    }
    open.outTime = now.time;
    await saveAttendance(open);
    return { status: "out", record: withFlags(open, nowMs) };
  }

  const stamp = new Date(nowMs).toISOString();
  const record = await addAttendance({
    id: newId(),
    date: now.date,
    phone: member.phone,
    name: member.name,
    inTime: now.time,
    outTime: "",
    addedBy: "",
    createdAt: stamp,
    updatedAt: stamp,
  });
  return { status: "in", record: withFlags(record, nowMs) };
});
