import { body, cleanName, cleanPhone, fail, handle, requireAdmin } from "@/lib/api";
import { addAttendance, deleteAttendance, findAttendance, findOrCreateMember, listDay, newId, saveAttendance } from "@/lib/db";
import { isDate, isTime, today } from "@/lib/time";

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const date = new URL(req.url).searchParams.get("date") ?? today();
  if (!isDate(date)) fail(400, "Invalid date");
  const records = (await listDay(date)).sort((a, b) => a.inTime.localeCompare(b.inTime));
  return { date, records };
});

/** Admin manual entry. Body: { date, name, phone, inTime, outTime? } */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req);
  if (!isDate(b.date) || !isTime(b.inTime)) fail(400, "Pick a date and in time");
  if (b.outTime && !isTime(b.outTime)) fail(400, "Invalid out time");
  const member = await findOrCreateMember(cleanName(b.name), cleanPhone(b.phone));
  const stamp = new Date().toISOString();
  const record = await addAttendance({
    id: newId(),
    date: b.date as string,
    phone: member.phone,
    name: member.name,
    inTime: b.inTime as string,
    outTime: (b.outTime as string) || "",
    addedBy: "admin",
    addedByName: "Admin",
    entryType: "admin",
    createdAt: stamp,
    updatedAt: stamp,
  });
  return { record };
});

/** Admin can correct any visit without the member time windows. Body: { date, id, inTime, outTime } */
export const PATCH = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req);
  if (!isDate(b.date) || typeof b.id !== "string") fail(400, "Invalid request");
  const record = await findAttendance(b.date as string, b.id as string);
  if (!record) return fail(404, "Attendance not found");
  if (!isTime(b.inTime)) fail(400, "Invalid in time");
  if (b.outTime && !isTime(b.outTime)) fail(400, "Invalid out time");
  record.inTime = b.inTime as string;
  record.outTime = (b.outTime as string) || "";
  await saveAttendance(record);
  return { record };
});

export const DELETE = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req);
  if (!isDate(b.date) || typeof b.id !== "string") fail(400, "Invalid request");
  await deleteAttendance(b.date as string, b.id as string);
});
