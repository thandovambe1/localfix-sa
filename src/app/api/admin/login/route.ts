import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, auditLogs } from "@/db/schema";
import { ADMIN_COOKIE, createSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  // Generic error message — never reveal whether the email exists.
  const invalid = Response.json({ error: "Invalid email or password." }, { status: 401 });
  if (!user || !user.active) return invalid;
  if (!verifyPassword(password, user.passwordHash)) return invalid;

  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.insert(auditLogs).values({
    actor: user.email,
    action: "admin.login",
    target: `admin_user:${user.id}`,
    detail: "Signed in to the admin dashboard",
  });

  const token = createSessionToken(user);
  const res = Response.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.headers.append(
    "Set-Cookie",
    serializeCookie(ADMIN_COOKIE, token, sessionCookieOptions()),
  );
  return res;
}

function serializeCookie(
  name: string,
  value: string,
  opts: { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number },
): string {
  const parts = [
    `${name}=${value}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite === "lax" ? "Lax" : opts.sameSite}`,
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}
