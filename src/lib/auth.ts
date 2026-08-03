import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "lfx_admin_session";
export const CUSTOMER_COOKIE = "lfx_customer_session";
export const PROVIDER_COOKIE = "lfx_provider_session";

/** Session lifetime: 8 hours */
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "localfix-dev-secret-change-me-in-production";
}

// ───────────────────────── Password hashing (scrypt) ─────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ───────────────────────── Signed session tokens ─────────────────────────

export type AdminSession = {
  id: number;
  email: string;
  name: string;
  role: string;
  exp: number;
};

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(user: { id: number; email: string; name: string; role: string }): string {
  const session: AdminSession = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const payload = b64url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  // Constant-time signature comparison
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (!session.exp || session.exp * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// ───────────────────────── Cookie helpers ─────────────────────────

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return readSessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge: number = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Roles allowed to release money. */
export function canProcessPayouts(role: string): boolean {
  return role === "owner" || role === "admin" || role === "finance";
}

// ───────────────────────── Customer sessions ─────────────────────────

export type CustomerSession = {
  id: number;
  email: string;
  name: string;
  role: string;
  exp: number;
};

export function createCustomerToken(user: { id: number; email: string; name: string }): string {
  return createSessionToken({ ...user, role: "customer" });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const session = readSessionToken(store.get(CUSTOMER_COOKIE)?.value);
  if (!session || session.role !== "customer") return null;
  return session;
}

export type ProviderSession = {
  id: number;
  email: string;
  name: string;
  role: string;
  exp: number;
};

export function createProviderToken(user: { id: number; email: string; name: string }): string {
  return createSessionToken({ ...user, role: "provider" });
}

export async function getProviderSession(): Promise<ProviderSession | null> {
  const store = await cookies();
  const session = readSessionToken(store.get(PROVIDER_COOKIE)?.value);
  if (!session || session.role !== "provider") return null;
  return session;
}

/** Serialise a Set-Cookie header value for auth cookies. */
export function buildCookie(name: string, value: string, maxAge: number = MAX_AGE_SECONDS): string {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax", "HttpOnly"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
