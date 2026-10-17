import { getMember, isAdmin, type MemberSession } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};

/** Wraps a route handler so thrown HttpErrors become JSON error responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return data instanceof Response ? data : Response.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      // Next.js signals (prerender bail-out, redirects) carry a digest and must propagate.
      if (e && typeof e === "object" && "digest" in e) throw e;
      console.error(e);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function requireMember(): Promise<MemberSession> {
  return (await getMember()) ?? fail(401, "Please register first");
}

/** Rejects requests that don't carry the key printed in the gym QR. */
export function requireGymKey(k: unknown) {
  const key = process.env.GYM_QR_KEY;
  if (key && k !== key) fail(403, "This QR code is not valid. Please scan the QR at the gym.");
}

export async function requireAdmin() {
  if (!(await isAdmin())) fail(401, "Admin login required");
}

/** Normalises Indian mobile numbers to 10 digits. */
export function cleanPhone(v: unknown) {
  const digits = String(v ?? "").replace(/\D/g, "");
  const phone = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(phone)) fail(400, "Enter a valid 10-digit mobile number");
  return phone;
}

export function cleanName(v: unknown) {
  const name = String(v ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) fail(400, "Enter your full name");
  return name;
}
