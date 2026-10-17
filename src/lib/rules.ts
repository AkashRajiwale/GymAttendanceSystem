import type { Attendance } from "./db";
import { MINUTE, istToMs } from "./time";

/** In time can be corrected for 1 hour after the scan, to any time up to 1 hour before it. */
export const IN_EDIT_WINDOW = 60 * MINUTE;
/** Out time can be set to any time within the last 2 hours. */
export const OUT_WINDOW = 120 * MINUTE;
/** A second scan this soon after checking in is treated as an accidental double scan. */
export const DOUBLE_SCAN_GUARD = 3 * MINUTE;

const inMs = (a: Attendance) => istToMs(a.date, a.inTime);

/** Out time as epoch ms; an out clock time before the in time means after midnight. */
function outMs(a: Attendance, outTime: string) {
  let ms = istToMs(a.date, outTime);
  if (ms < inMs(a)) ms += 24 * 60 * MINUTE;
  return ms;
}

export function canEditIn(a: Attendance, now = Date.now()) {
  return now - Date.parse(a.createdAt) <= IN_EDIT_WINDOW;
}

export function canSetOut(a: Attendance, now = Date.now()) {
  return now - inMs(a) >= 0 && (!a.outTime || now - outMs(a, a.outTime) <= OUT_WINDOW);
}

/** Returns an error message, or null when the new in time is allowed. */
export function checkInTime(a: Attendance, inTime: string, now = Date.now()) {
  if (!canEditIn(a, now)) return "In time can only be changed within 1 hour of check-in";
  const created = Date.parse(a.createdAt);
  const ms = istToMs(a.date, inTime);
  if (ms < created - IN_EDIT_WINDOW) return "In time can be at most 1 hour before you scanned";
  if (ms > now + MINUTE) return "In time can't be in the future";
  if (a.outTime && ms >= istToMs(a.date, a.outTime)) return "In time must be before out time";
  return null;
}

export function checkOutTime(a: Attendance, outTime: string, now = Date.now()) {
  if (!canSetOut(a, now)) return "Out time can only be changed within 2 hours";
  const ms = outMs(a, outTime);
  // A clock time before the in time is only "after midnight" if that moment has already passed.
  const sameDayMs = istToMs(a.date, outTime);
  if (sameDayMs <= inMs(a) && ms > now + MINUTE) return "Out time must be after in time";
  if (ms > now + MINUTE) return "Out time can't be in the future";
  if (ms < now - OUT_WINDOW) return "Out time must be within the last 2 hours";
  if (ms <= inMs(a)) return "Out time must be after in time";
  return null;
}

/** Extra fields the UI needs to decide which buttons to show. */
export function withFlags(a: Attendance, now = Date.now()) {
  return { ...a, canEditIn: canEditIn(a, now), canSetOut: canSetOut(a, now) };
}
