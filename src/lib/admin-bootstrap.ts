import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export type RoleSeed = {
  email: string;
  password: string;
  name: string;
  role: "owner" | "admin" | "finance";
};

/**
 * Production staff credentials. Environment variables win when set
 * (Vercel stores them literally); otherwise the platform defaults apply.
 */
export function configuredAdmins(): RoleSeed[] {
  const users: RoleSeed[] = [
    {
      email: process.env.FOUNDER_EMAIL ?? "founder@localfix.co.za",
      password: process.env.FOUNDER_PASSWORD ?? "localfix@p@$$w0RD@",
      name: "Founder",
      role: "owner",
    },
    {
      email: process.env.ADMIN_EMAIL ?? "admin@localfix.co.za",
      password: process.env.ADMIN_PASSWORD ?? "localfix@p@$$w0RD@",
      name: "Platform Admin",
      role: "admin",
    },
    {
      email: process.env.FINANCE_EMAIL ?? "finance@localfix.co.za",
      password: process.env.FINANCE_PASSWORD ?? "localfix@p@$$w0RD@",
      name: "Finance Manager",
      role: "finance",
    },
  ];
  return users.map((u) => ({ ...u, email: u.email.toLowerCase().trim() }));
}

/**
 * Guarantees the three configured staff accounts exist after any
 * deployment, so logins work immediately on a fresh OR existing
 * database without a manual setup call.
 *
 * Safety rules:
 *  - Missing staff accounts are created.
 *  - Existing accounts (including ones whose password was changed via
 *    the founder-code flow, or legacy accounts) are NEVER overwritten,
 *    deactivated or removed here. Use POST /api/admin/setup with
 *    ADMIN_SETUP_TOKEN to intentionally re-sync credentials.
 */
export async function bootstrapAdminsIfEmpty(): Promise<boolean> {
  const existing = await db
    .select({ email: adminUsers.email })
    .from(adminUsers);
  const have = new Set(existing.map((row) => row.email.toLowerCase()));

  let created = false;
  for (const user of configuredAdmins()) {
    if (have.has(user.email)) continue;
    await db.insert(adminUsers).values({
      email: user.email,
      name: user.name,
      passwordHash: hashPassword(user.password),
      role: user.role,
      active: true,
    });
    created = true;
  }
  return created;
}
