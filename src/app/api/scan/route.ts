import { body, handle, requireGymKey, requireMember } from "@/lib/api";
import { scanFor } from "@/lib/visits";

/**
 * Called when a member scans the gym QR.
 * No open visit today -> check in. Open visit -> check out.
 */
export const POST = handle(async (req: Request) => {
  const b = await body(req);
  requireGymKey(b.k);
  const member = await requireMember();
  return scanFor(member, null, b.intent === "out" ? "out" : undefined);
});
