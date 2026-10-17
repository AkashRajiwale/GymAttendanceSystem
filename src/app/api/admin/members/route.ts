import { handle, requireAdmin } from "@/lib/api";
import { listAttendance, listMembers } from "@/lib/db";
import { currentMonth } from "@/lib/time";

export const GET = handle(async () => {
  await requireAdmin();
  const [members, visits] = await Promise.all([listMembers(), listAttendance(currentMonth())]);
  const lastVisit = new Map<string, string>();
  for (const v of visits) {
    if ((lastVisit.get(v.phone) ?? "") < v.date) lastVisit.set(v.phone, v.date);
  }
  return {
    members: members
      .map((m) => ({ ...m, lastVisit: lastVisit.get(m.phone) ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
});
