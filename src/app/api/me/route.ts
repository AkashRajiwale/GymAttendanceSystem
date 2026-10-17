import { handle } from "@/lib/api";
import { getMember, setMember } from "@/lib/auth";
import { listDay } from "@/lib/db";
import { withFlags } from "@/lib/rules";
import { today } from "@/lib/time";

export const GET = handle(async () => {
  const member = await getMember();
  if (!member) return { member: null };
  // Re-issue the cookie so an active member never gets logged out.
  await setMember(member);

  const date = today();
  const day = await listDay(date);
  const mine = day.filter((a) => a.phone === member.phone && a.addedBy !== member.phone);
  const added = day.filter((a) => a.addedBy === member.phone);
  return {
    member,
    date,
    mine: mine.length ? withFlags(mine[mine.length - 1]) : null,
    added: added.map((a) => withFlags(a)),
  };
});
