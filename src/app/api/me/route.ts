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
  const byTime = (x: { createdAt: string }, y: { createdAt: string }) => x.createdAt.localeCompare(y.createdAt);
  const mine = day.filter((a) => a.phone === member.phone).sort(byTime);
  const added = day.filter((a) => a.addedBy === member.phone).sort(byTime);
  return {
    member,
    date,
    // Latest visit gets the controls; earlier visits today (e.g. morning) are listed.
    mine: mine.length ? withFlags(mine[mine.length - 1]) : null,
    earlier: mine.slice(0, -1).map((a) => withFlags(a)),
    added: added.map((a) => withFlags(a)),
  };
});
