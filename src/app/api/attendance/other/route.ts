import { body, cleanName, cleanPhone, fail, handle, requireGymKey, requireMember } from "@/lib/api";
import { memberRef } from "@/lib/auth";
import { findOrCreateMember, listMembers } from "@/lib/db";
import { scanFor } from "@/lib/visits";

/**
 * Scan the gym QR on behalf of someone who doesn't have their phone.
 * Body: { k, ref } for a registered member picked from the list,
 *    or { k, name, phone } for someone new.
 * Like a normal scan, it checks them in, or out if they're already in.
 */
export const POST = handle(async (req: Request) => {
  const me = await requireMember();
  const b = await body(req);
  requireGymKey(b.k);

  const person =
    typeof b.ref === "string"
      ? ((await listMembers()).find((m) => memberRef(m.phone) === b.ref) ?? fail(404, "Member not found"))
      : await findOrCreateMember(cleanName(b.name), cleanPhone(b.phone));
  if (person.phone === me.phone) fail(400, "That's you — use the main Scan button to mark yourself");

  return scanFor(person, me, b.intent === "out" ? "out" : undefined);
});
