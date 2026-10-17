import { handle, requireAdmin } from "@/lib/api";

/** The URL to print as the gym's attendance QR code. */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const key = process.env.GYM_QR_KEY;
  return { scanUrl: `${origin}/scan${key ? `?k=${encodeURIComponent(key)}` : ""}` };
});
