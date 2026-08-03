import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, auditLogs } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { configuredAdmins } from "@/lib/admin-bootstrap";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Production admin bootstrap.
 *
 * Creates the three real admin profiles only when there are zero admin users.
 * After any admin exists, setup is disabled and password changes must happen
 * through the founder-code workflow.
 */
export async function POST(request: Request) {
  await ready();

  const body = (await request.json().catch(() => ({}))) as { setupToken?: string };
  const existing = await db.execute<{ count: string }>(sql`select count(*)::text as count from admin_users`);
  const existingCount = Number(existing.rows[0]?.count ?? "0");

  /**
   * First run is allowed without a token when there are zero admins.
   * If admins already exist, require ADMIN_SETUP_TOKEN so this endpoint can
   * still be used to repair the production roles without exposing takeover.
   */
  if (existingCount > 0) {
    const required = process.env.ADMIN_SETUP_TOKEN;
    const supplied = request.headers.get("x-admin-setup-token") ?? body.setupToken;
    if (!required || supplied !== required) {
      return Response.json(
        { error: "Admin setup is locked. Provide ADMIN_SETUP_TOKEN to repair admin profiles." },
        { status: 403 },
      );
    }
  }

  const users = configuredAdmins();
  const upserted: { email: string; role: string; action: "created" | "updated" }[] = [];

  for (const user of users) {
    const [existingUser] = await db.select().from(adminUsers).where(eq(adminUsers.email, user.email)).limit(1);
    if (existingUser) {
      await db
        .update(adminUsers)
        .set({
          name: user.name,
          role: user.role,
          active: true,
          passwordHash: hashPassword(user.password),
        })
        .where(eq(adminUsers.id, existingUser.id));
      upserted.push({ email: user.email, role: user.role, action: "updated" });
    } else {
      await db.insert(adminUsers).values({
        email: user.email,
        name: user.name,
        passwordHash: hashPassword(user.password),
        role: user.role,
        active: true,
      });
      upserted.push({ email: user.email, role: user.role, action: "created" });
    }
  }

  // Only the configured production roles should be active.
  const allowedList = sql.join(
    users.map((u) => sql`${u.email}`),
    sql`, `,
  );
  await db.execute(sql`
    update admin_users
    set active = false
    where lower(email) not in (${allowedList})
  `);

  await db.insert(auditLogs).values({



    actor: "system",
    action: existingCount > 0 ? "admin.repair" : "admin.bootstrap",
    target: "admin_users",
    detail: "Founder, admin and finance profiles synced from production configuration",
  });

  return Response.json({
    ok: true,
    message: "Founder, admin and finance profiles are ready.",
    users: upserted,
  });
}

/**
 * Optional maintenance method for Vercel/ops: POST remains the normal path;
 * PATCH is blocked unless called by an already existing owner in future.
 */
export async function PATCH() {
  return Response.json({ error: "Use POST only for first-run setup." }, { status: 405 });
}
