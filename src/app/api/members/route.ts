import { handle, requireMember } from "@/lib/api";
import { memberRef } from "@/lib/auth";
import { listMembers } from "@/lib/db";

/** Member picker for "mark someone else". Phone numbers are masked. */
export const GET = handle(async () => {
  const me = await requireMember();
  const members = (await listMembers())
    .filter((m) => m.phone !== me.phone)
    .map((m) => ({ ref: memberRef(m.phone), name: m.name, last4: m.phone.slice(-4) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { members };
});
