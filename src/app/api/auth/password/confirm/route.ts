import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, passwordResetCodes, providers } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

type AccountType = "customer" | "provider";

export async function POST(request: Request) {
  await ready();

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    accountType?: AccountType;
    code?: string;
    newPassword?: string;
  };

  const email = String(body.email ?? "").trim().toLowerCase();
  const accountType: AccountType = body.accountType === "provider" ? "provider" : "customer";
  const code = String(body.code ?? "").trim();
  const newPassword = String(body.newPassword ?? "");

  if (!email.includes("@")) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return Response.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
  if (newPassword.length < 8) return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });

  const [entry] = await db
    .select()
    .from(passwordResetCodes)
    .where(
      and(
        eq(passwordResetCodes.accountType, accountType),
        eq(passwordResetCodes.email, email),
        eq(passwordResetCodes.used, false),
        sql`${passwordResetCodes.expiresAt} > now()`,
      ),
    )
    .orderBy(desc(passwordResetCodes.createdAt))
    .limit(1);

  if (!entry || !verifyPassword(code, entry.codeHash)) {
    return Response.json({ error: "Invalid or expired verification code." }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    const nextHash = hashPassword(newPassword);
    if (accountType === "customer") {
      await tx.update(customers).set({ passwordHash: nextHash }).where(eq(customers.id, entry.accountId));
    } else {
      await tx.update(providers).set({ passwordHash: nextHash }).where(eq(providers.id, entry.accountId));
    }

    await tx
      .update(passwordResetCodes)
      .set({ used: true, usedAt: new Date() })
      .where(eq(passwordResetCodes.id, entry.id));

    await tx
      .update(passwordResetCodes)
      .set({ used: true })
      .where(
        and(
          eq(passwordResetCodes.accountType, accountType),
          eq(passwordResetCodes.accountId, entry.accountId),
          eq(passwordResetCodes.used, false),
        ),
      );
  });

  return Response.json({ ok: true, message: "Password reset successfully. You can now sign in." });
}
