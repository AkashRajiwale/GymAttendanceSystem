import { handle } from "@/lib/api";
import { clearMember } from "@/lib/auth";

export const POST = handle(async () => {
  await clearMember();
});
