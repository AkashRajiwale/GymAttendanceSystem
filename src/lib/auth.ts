import crypto from "node:crypto";
import { cookies } from "next/headers";

const MEMBER_COOKIE = "vf_member";
const ADMIN_COOKIE = "vf_admin";
// Browsers cap cookie lifetime at 400 days; /api/me refreshes it so members stay logged in.
const MEMBER_MAX_AGE = 400 * 24 * 60 * 60;
const ADMIN_MAX_AGE = 30 * 24 * 60 * 60;

export type MemberSession = { phone: string; name: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.VERCEL) throw new Error("SESSION_SECRET must be set");
  return "dev-only-secret-change-me";
}

function sign(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function getMember() {
  return verify<MemberSession>((await cookies()).get(MEMBER_COOKIE)?.value);
}

export async function setMember(m: MemberSession) {
  (await cookies()).set(MEMBER_COOKIE, sign({ phone: m.phone, name: m.name }), cookieOptions(MEMBER_MAX_AGE));
}

export async function clearMember() {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function isAdmin() {
  return verify<{ admin: true }>((await cookies()).get(ADMIN_COOKIE)?.value)?.admin === true;
}

export async function setAdmin() {
  (await cookies()).set(ADMIN_COOKIE, sign({ admin: true }), cookieOptions(ADMIN_MAX_AGE));
}

export async function clearAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export function checkAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? (process.env.VERCEL ? "" : "admin");
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
