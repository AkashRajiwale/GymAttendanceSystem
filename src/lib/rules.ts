import type { Attendance } from "./db";
import { MINUTE, istToMs } from "./time";

/** In time can be corrected for 1 hour after the scan, to any time up to 1 hour before it. */
export const IN_EDIT_WINDOW = 60 * MINUTE;
/** After checking out, in and out times can be corrected for this long, then they are locked. */
export const AFTER_OUT_EDIT_WINDOW = 60 * MINUTE;
/** Out time can be set to any time within 2 hours of now, before or after. */
export const OUT_WINDOW = 120 * MINUTE;
/** A second scan this soon after checking in is treated as an accidental double scan. */
export const DOUBLE_SCAN_GUARD = 3 * MINUTE;
/**
 * A visit still open after this long was never checked out (e.g. a morning visit).
 * Scanning again starts a new visit instead of closing the old one hours later.
 */
export const STALE_VISIT = 5 * 60 * MINUTE;

export function isStale(a: Attendance, now = Date.now()) {
  return !a.outTime && now - inMs(a) > STALE_VISIT;
}

const inMs = (a: Attendance) => istToMs(a.date, a.inTime);

/** Out time as epoch ms; an out clock time before the in time means after midnight. */
function outMs(a: Attendance, outTime: string) {
  let ms = istToMs(a.date, outTime);
  if (ms < inMs(a)) ms += 24 * 60 * MINUTE;
  return ms;
}

/** Checked out, and still within the hour after checking out. */
function inAfterOutWindow(a: Attendance, now: number) {
  return now - Date.parse(a.outRecordedAt || a.updatedAt) <= AFTER_OUT_EDIT_WINDOW;
}

export function canEditIn(a: Attendance, now = Date.now()) {
  if (a.outTime) return inAfterOutWindow(a, now);
  return now - Date.parse(a.createdAt) <= IN_EDIT_WINDOW;
}

export function canSetOut(a: Attendance, now = Date.now()) {
  if (a.outTime) return inAfterOutWindow(a, now);
  return !isStale(a, now) && now - inMs(a) >= 0;
}

const LOCKED = "Times can only be changed within 1 hour of checking out";

/** Returns an error message, or null when the new in time is allowed. */
export function checkInTime(a: Attendance, inTime: string, now = Date.now()) {
  if (!canEditIn(a, now)) return a.outTime ? LOCKED : "In time can only be changed within 1 hour of check-in";
  const created = Date.parse(a.createdAt);
  const ms = istToMs(a.date, inTime);
  if (ms < created - IN_EDIT_WINDOW) return "In time can be at most 1 hour before you scanned";
  if (ms > now + MINUTE) return "In time can't be in the future";
  if (a.outTime && ms >= istToMs(a.date, a.outTime)) return "In time must be before out time";
  return null;
}

export function checkOutTime(a: Attendance, outTime: string, now = Date.now()) {
  if (!canSetOut(a, now)) return a.outTime ? LOCKED : "This visit can no longer be checked out — ask the admin";
  // A clock time before the in time means after midnight only when that is near now.
  const sameDayMs = istToMs(a.date, outTime);
  const ms = sameDayMs <= inMs(a) && Math.abs(outMs(a, outTime) - now) <= OUT_WINDOW ? outMs(a, outTime) : sameDayMs;
  if (ms <= inMs(a)) return "Out time must be after in time";
  if (Math.abs(ms - now) > OUT_WINDOW) return "Out time must be within 2 hours of now";
  return null;
}

/** A mistaken entry can be deleted by the member for 1 hour after it was created. */
export const DELETE_WINDOW = 60 * MINUTE;

export function canDelete(a: Attendance, now = Date.now()) {
  return now - Date.parse(a.createdAt) <= DELETE_WINDOW;
}

/** Extra fields the UI needs to decide which buttons to show. */
export function withFlags(a: Attendance, now = Date.now()) {
  return { ...a, canEditIn: canEditIn(a, now), canSetOut: canSetOut(a, now), canDelete: canDelete(a, now) };
}
