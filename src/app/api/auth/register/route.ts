import { body, cleanName, cleanPhone, handle } from "@/lib/api";
import { setMember } from "@/lib/auth";
import { findOrCreateMember } from "@/lib/db";

// Registers a new member, or logs an existing one in on a new phone.
export const POST = handle(async (req: Request) => {
  const b = await body(req);
  const phone = cleanPhone(b.phone);
  const name = cleanName(b.name);
  const member = await findOrCreateMember(name, phone);
  await setMember(member);
  return { member: { phone: member.phone, name: member.name } };
});
