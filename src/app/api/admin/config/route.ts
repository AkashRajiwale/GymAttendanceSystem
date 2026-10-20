import { handle, requireAdmin } from "@/lib/api";

/**
 * The URL to print as the gym's attendance QR code. It must be a full public https link:
 * a phone's own camera app only opens the QR as a website when it is one.
 * Order: APP_URL, then Vercel's production domain (set automatically), then this request.
 */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = (process.env.APP_URL || (vercel ? `https://${vercel}` : "") || new URL(req.url).origin).replace(/\/$/, "");
  const key = process.env.GYM_QR_KEY;
  const scanUrl = `${origin}/scan${key ? `?k=${encodeURIComponent(key)}` : ""}`;

  const host = new URL(origin).hostname;
  const local = host === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  return {
    scanUrl,
    warning: local
      ? "This QR points to a local computer, so members' phones can't open it. Set APP_URL to your live site and print again."
      : !origin.startsWith("https://")
        ? "This QR isn't https. Phone cameras may not open it, and the in-app camera won't work."
        : null,
  };
});
