import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminPasswordCodes, adminUsers, auditLogs } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    code?: string;
    newPassword?: string;
  };

  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").trim();
  const newPassword = String(body.newPassword ?? "");

  if (!email.includes("@")) return Response.json({ error: "Enter a valid admin email address." }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return Response.json({ error: "Enter the 6-digit founder code." }, { status: 400 });
  if (newPassword.length < 12) {
    return Response.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  }

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (!admin || !admin.active) return Response.json({ error: "Invalid code or account." }, { status: 400 });

  const [entry] = await db
    .select()
    .from(adminPasswordCodes)
    .where(
      and(
        eq(adminPasswordCodes.adminUserId, admin.id),
        eq(adminPasswordCodes.adminEmail, email),
        eq(adminPasswordCodes.used, false),
        sql`${adminPasswordCodes.expiresAt} > now()`,
      ),
    )
    .orderBy(desc(adminPasswordCodes.createdAt))
    .limit(1);

  if (!entry || !verifyPassword(code, entry.codeHash)) {
    return Response.json({ error: "Invalid or expired founder code." }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.update(adminUsers).set({ passwordHash: hashPassword(newPassword) }).where(eq(adminUsers.id, admin.id));

    await tx
      .update(adminPasswordCodes)
      .set({ used: true, usedAt: new Date() })
      .where(eq(adminPasswordCodes.id, entry.id));

    // Burn any other outstanding codes for this user.
    await tx
      .update(adminPasswordCodes)
      .set({ used: true })
      .where(and(eq(adminPasswordCodes.adminUserId, admin.id), eq(adminPasswordCodes.used, false)));

    await tx.insert(auditLogs).values({
      actor: admin.email,
      action: "admin.password_changed",
      target: `admin_user:${admin.id}`,
      detail: "Password changed using founder-approved verification code",
    });
  });

  return Response.json({ ok: true, message: "Password changed successfully. You can now sign in." });
}
