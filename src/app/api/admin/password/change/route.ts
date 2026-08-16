import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, auditLogs } from "@/db/schema";
import { getAdminSession, hashPassword, verifyPassword } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/password/change
 *
 * Founder-only direct password change. The authenticated user must:
 *   1. Be signed in as an admin with role "owner".
 *   2. Supply their correct current password.
 *   3. Supply a new password of at least 12 characters.
 *   4. Supply a matching confirmation.
 *
 * The new password is hashed with the existing scryptSync implementation
 * and saved to admin_users.password_hash for the authenticated row only.
 *
 * No password is ever logged, returned, or stored in plaintext.
 */
export async function POST(request: Request) {
  await ready();

  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "You must be signed in as an admin." }, { status: 401 });
  }
  if (session.role !== "owner") {
    return Response.json(
      { error: "Only the Founder (role: owner) can use this endpoint." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (!currentPassword) {
    return Response.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (newPassword.length < 12) {
    return Response.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return Response.json({ error: "New password and confirmation do not match." }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, session.id))
    .limit(1);

  if (!user || !user.active || user.role !== "owner") {
    return Response.json({ error: "Founder account not found or not active." }, { status: 403 });
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return Response.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const newHash = hashPassword(newPassword);

  await db
    .update(adminUsers)
    .set({ passwordHash: newHash })
    .where(eq(adminUsers.id, user.id));

  await db.insert(auditLogs).values({
    actor: user.email,
    action: "founder.password_changed_direct",
    target: `admin_user:${user.id}`,
    detail: "Founder changed password using current-password verification (no email code).",
  });

  return Response.json({
    ok: true,
    message: "Password changed successfully. Use your new password next time you sign in.",
  });
}
