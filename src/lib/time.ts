// All gym times are India Standard Time (UTC+05:30, no DST).
const IST_OFFSET_MS = 330 * 60 * 1000;

export const MINUTE = 60 * 1000;

/** IST calendar date ("YYYY-MM-DD") and clock time ("HH:mm") for an instant. */
export function istParts(ms: number = Date.now()) {
  const iso = new Date(ms + IST_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function today() {
  return istParts().date;
}

export function currentMonth() {
  return today().slice(0, 7);
}

/** Epoch ms for an IST date + "HH:mm". */
export function istToMs(date: string, time: string) {
  return Date.parse(`${date}T${time}:00+05:30`);
}

export function isDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function isMonth(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
}

export function isTime(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** "19:05" -> "7:05 PM" */
export function fmtTime(t: string) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-10-17" -> "17 Oct 2026" */
export function fmtDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-10" -> "October 2026" */
export function fmtMonth(m: string) {
  return new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-10" + 2 -> "2026-12"; negative steps go back. */
export function addMonths(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const total = y * 12 + (mo - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Number of months from a to b inclusive. */
export function monthSpan(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return by * 12 + bm - (ay * 12 + am) + 1;
}

/** "Oct 2026" or "Oct – Dec 2026" */
export function fmtMonthRange(from: string, to: string) {
  const short = (m: string, year: boolean) =>
    new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: year ? "numeric" : undefined, timeZone: "UTC" });
  if (from === to) return short(from, true);
  return `${short(from, from.slice(0, 4) !== to.slice(0, 4))} – ${short(to, true)}`;
}

/** Minutes between two "HH:mm" times; an out time before in time means past midnight. */
export function durationMinutes(inTime: string, outTime: string) {
  if (!inTime || !outTime) return null;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  let mins = oh * 60 + om - (ih * 60 + im);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function fmtDuration(mins: number | null) {
  if (mins === null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
