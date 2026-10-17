import { addAttendance, listDay, newId, saveAttendance } from "./db";
import { DOUBLE_SCAN_GUARD, isStale, withFlags } from "./rules";
import { istParts } from "./time";

type Person = { phone: string; name: string };
export type ScanStatus = "in" | "out" | "already-in";

/**
 * One QR scan for `person`: checks them out if they have an open visit today,
 * otherwise starts a new visit. `by` is set when someone else is scanning for them.
 */
export async function scanFor(person: Person, by: Person | null, nowMs = Date.now()) {
  const now = istParts(nowMs);
  const open = (await listDay(now.date))
    .filter((a) => a.phone === person.phone && !a.outTime && !isStale(a, nowMs))
    .sort((x, y) => x.createdAt.localeCompare(y.createdAt))
    .pop();

  if (open) {
    if (nowMs - Date.parse(open.createdAt) < DOUBLE_SCAN_GUARD) {
      return { status: "already-in" as ScanStatus, record: withFlags(open, nowMs) };
    }
    open.outTime = now.time;
    await saveAttendance(open);
    return { status: "out" as ScanStatus, record: withFlags(open, nowMs) };
  }

  const stamp = new Date(nowMs).toISOString();
  const record = await addAttendance({
    id: newId(),
    date: now.date,
    phone: person.phone,
    name: person.name,
    inTime: now.time,
    outTime: "",
    addedBy: by?.phone ?? "",
    addedByName: by?.name ?? person.name,
    entryType: by ? "other" : "self",
    createdAt: stamp,
    updatedAt: stamp,
  });
  return { status: "in" as ScanStatus, record: withFlags(record, nowMs) };
}
