import { handle, requireMember } from "@/lib/api";
import { memberRef } from "@/lib/auth";
import { listDay, listMembers } from "@/lib/db";
import { isStale } from "@/lib/rules";
import { today } from "@/lib/time";

/** Member picker for "mark someone else". Phone numbers are masked. */
export const GET = handle(async () => {
  const me = await requireMember();
  const [members, day] = await Promise.all([listMembers(), listDay(today())]);
  // Who is in the gym right now, so the picker can offer "check out" instead of "check in".
  const inside = new Set(day.filter((a) => !a.outTime && !isStale(a)).map((a) => a.phone));
  return {
    members: members
      .filter((m) => m.phone !== me.phone)
      .map((m) => ({ ref: memberRef(m.phone), name: m.name, last4: m.phone.slice(-4), inside: inside.has(m.phone) }))
      // People currently inside first: they are the ones most likely to need checking out.
      .sort((a, b) => Number(b.inside) - Number(a.inside) || a.name.localeCompare(b.name)),
  };
});
