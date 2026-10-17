import crypto from "node:crypto";
import { store, type Row } from "./store";

export type Member = { phone: string; name: string; joinedAt: string };

export type Attendance = {
  id: string;
  date: string; // YYYY-MM-DD (IST)
  phone: string;
  name: string;
  inTime: string; // HH:mm (IST)
  outTime: string; // HH:mm (IST) or ""
  addedBy: string; // phone of whoever recorded it ("" = self, "admin" = admin)
  createdAt: string; // ISO timestamp of the actual scan/entry
  updatedAt: string;
  addedByName: string; // name of whoever recorded it
  entryType: EntryType;
};

/** self = member scanned for themselves, other = marked by another member, admin = entered by admin */
export type EntryType = "self" | "other" | "admin";

export type Payment = {
  id: string;
  phone: string;
  name: string;
  month: string; // YYYY-MM: first month this payment covers
  toMonth: string; // YYYY-MM: last month covered (same as month for a single month)
  amount: number;
  paidOn: string; // YYYY-MM-DD
  mode: string;
  note: string;
  createdAt: string;
};

const MEMBERS = "Members";
const MEMBER_HEADERS = ["phone", "name", "joined_at"];

const PAYMENTS = "Payments";
// New columns are only ever appended, so older rows keep working.
const PAYMENT_HEADERS = ["id", "phone", "name", "month", "amount", "paid_on", "mode", "note", "created_at", "to_month"];

// One attendance tab per month keeps every scan's read small and the sheet easy to browse.
const attendanceTab = (month: string) => `Attendance ${month}`;
const ATTENDANCE_HEADERS = [
  "id", "date", "phone", "name", "in_time", "out_time", "added_by", "created_at", "updated_at",
  "added_by_name", "entry_type",
];

export const newId = () => crypto.randomBytes(6).toString("base64url");

const ensured = new Set<string>();
async function table(tab: string, headers: string[]) {
  if (!ensured.has(tab)) {
    await store().ensureTab(tab, headers);
    ensured.add(tab);
  }
  return store();
}

// ---------------------------------------------------------------- Members

// Members are read on every registration/admin view; a short per-instance cache keeps that fast.
let membersCache: { at: number; list: Member[] } | null = null;
const MEMBERS_TTL_MS = 30_000;

export async function listMembers(): Promise<Member[]> {
  if (membersCache && Date.now() - membersCache.at < MEMBERS_TTL_MS) return membersCache.list;
  const rows = await (await table(MEMBERS, MEMBER_HEADERS)).rows(MEMBERS);
  const list = rows.filter((r) => r[0]).map((r) => ({ phone: r[0], name: r[1] ?? "", joinedAt: r[2] ?? "" }));
  membersCache = { at: Date.now(), list };
  return list;
}

/** Returns the existing member for this phone, or registers a new one. */
export async function findOrCreateMember(name: string, phone: string): Promise<Member> {
  membersCache = null;
  const members = await listMembers(); // fresh read, and the array now held by the cache
  const existing = members.find((m) => m.phone === phone);
  if (existing) return existing;
  const member: Member = { phone, name, joinedAt: new Date().toISOString() };
  await (await table(MEMBERS, MEMBER_HEADERS)).append(MEMBERS, [member.phone, member.name, member.joinedAt]);
  members.push(member);
  return member;
}

// ---------------------------------------------------------------- Attendance

const toAttendance = (r: string[]): Attendance => {
  const addedBy = r[6] ?? "";
  return {
    id: r[0],
    date: r[1] ?? "",
    phone: r[2] ?? "",
    name: r[3] ?? "",
    inTime: r[4] ?? "",
    outTime: r[5] ?? "",
    addedBy,
    createdAt: r[7] ?? "",
    updatedAt: r[8] ?? "",
    addedByName: r[9] ?? "",
    // Rows written before entry_type existed are inferred from added_by.
    entryType: (r[10] as EntryType) || (!addedBy ? "self" : addedBy === "admin" ? "admin" : "other"),
  };
};

const fromAttendance = (a: Attendance): Row => [
  a.id, a.date, a.phone, a.name, a.inTime, a.outTime, a.addedBy, a.createdAt, a.updatedAt,
  a.addedByName, a.entryType,
];

export async function listAttendance(month: string): Promise<Attendance[]> {
  const tab = attendanceTab(month);
  // Reading a month nobody has visited yet must not create an empty tab.
  if (!ensured.has(tab) && !(await store().hasTab(tab))) return [];
  const rows = await store().rows(tab);
  return rows.filter((r) => r[0]).map(toAttendance);
}

export async function listDay(date: string) {
  return (await listAttendance(date.slice(0, 7))).filter((a) => a.date === date);
}

export async function addAttendance(a: Attendance) {
  const tab = attendanceTab(a.date.slice(0, 7));
  await (await table(tab, ATTENDANCE_HEADERS)).append(tab, fromAttendance(a));
  return a;
}

/** Re-reads the month tab to find the row, so concurrent appends can't shift it. */
export async function saveAttendance(a: Attendance) {
  const tab = attendanceTab(a.date.slice(0, 7));
  const s = await table(tab, ATTENDANCE_HEADERS);
  const index = (await s.rows(tab)).findIndex((r) => r[0] === a.id);
  if (index < 0) throw new Error("Attendance record not found");
  a.updatedAt = new Date().toISOString();
  await s.update(tab, index, fromAttendance(a));
  return a;
}

export async function deleteAttendance(date: string, id: string) {
  const tab = attendanceTab(date.slice(0, 7));
  const s = await table(tab, ATTENDANCE_HEADERS);
  const index = (await s.rows(tab)).findIndex((r) => r[0] === id);
  if (index >= 0) await s.remove(tab, index);
}

export async function findAttendance(date: string, id: string) {
  return (await listDay(date)).find((a) => a.id === id) ?? null;
}

// ---------------------------------------------------------------- Payments

const toPayment = (r: string[]): Payment => ({
  id: r[0],
  phone: r[1] ?? "",
  name: r[2] ?? "",
  month: r[3] ?? "",
  amount: Number(r[4]) || 0,
  paidOn: r[5] ?? "",
  mode: r[6] ?? "",
  note: r[7] ?? "",
  createdAt: r[8] ?? "",
  toMonth: r[9] || r[3] || "",
});

/** True when the payment covers the given month (bulk payments cover a range). */
export const coversMonth = (p: Payment, month: string) => p.month <= month && month <= p.toMonth;

export async function listPayments(): Promise<Payment[]> {
  const rows = await (await table(PAYMENTS, PAYMENT_HEADERS)).rows(PAYMENTS);
  return rows.filter((r) => r[0]).map(toPayment);
}

export async function addPayment(p: Payment) {
  await (await table(PAYMENTS, PAYMENT_HEADERS)).append(PAYMENTS, [
    p.id, p.phone, p.name, p.month, p.amount, p.paidOn, p.mode, p.note, p.createdAt, p.toMonth,
  ]);
  return p;
}

export async function deletePayment(id: string) {
  const s = await table(PAYMENTS, PAYMENT_HEADERS);
  const index = (await s.rows(PAYMENTS)).findIndex((r) => r[0] === id);
  if (index >= 0) await s.remove(PAYMENTS, index);
}
