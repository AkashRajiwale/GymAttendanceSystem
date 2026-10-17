import { body, fail, handle } from "@/lib/api";
import { checkAdminPassword, clearAdmin, isAdmin, setAdmin } from "@/lib/auth";

export const GET = handle(async () => ({ admin: await isAdmin() }));

export const POST = handle(async (req: Request) => {
  const { password } = await body(req);
  if (typeof password !== "string" || !checkAdminPassword(password)) fail(401, "Wrong password");
  await setAdmin();
});

export const DELETE = handle(async () => {
  await clearAdmin();
});
