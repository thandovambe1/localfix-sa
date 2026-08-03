import { randomInt } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, passwordResetCodes, providers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

type AccountType = "customer" | "provider";

function code6() {
  return String(randomInt(100000, 1000000));
}

async function findAccount(accountType: AccountType, email: string) {
  if (accountType === "customer") {
    const [account] = await db.select().from(customers).where(sql`lower(${customers.email}) = ${email}`).limit(1);
    return account ? { id: account.id, email: account.email, name: account.name, active: account.status === "active" } : null;
  }
  const [account] = await db.select().from(providers).where(sql`lower(${providers.email}) = ${email}`).limit(1);
  return account
    ? { id: account.id, email: account.email, name: account.businessName, active: account.status !== "suspended" }
    : null;
}

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as { email?: string; accountType?: AccountType };
  const email = String(body.email ?? "").trim().toLowerCase();
  const accountType: AccountType = body.accountType === "provider" ? "provider" : "customer";

  if (!email.includes("@")) return Response.json({ error: "Enter a valid email address." }, { status: 400 });

  const account = await findAccount(accountType, email);

  // Generic response for unknown accounts — don't leak existence.
  if (!account || !account.active) {
    return Response.json({
      ok: true,
      message: "If that account exists, a verification code has been sent to its registered email address.",
    });
  }

  const recent = await db
    .select({ id: passwordResetCodes.id })
    .from(passwordResetCodes)
    .where(
      sql`${passwordResetCodes.accountType} = ${accountType}
        and ${passwordResetCodes.accountId} = ${account.id}
        and ${passwordResetCodes.used} = false
        and ${passwordResetCodes.createdAt} > now() - interval '30 minutes'`,
    )
    .orderBy(desc(passwordResetCodes.createdAt));

  if (recent.length >= 3) {
    return Response.json({ error: "Too many reset requests. Please wait before requesting another code." }, { status: 429 });
  }

  const code = code6();
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;

  await db.insert(passwordResetCodes).values({
    accountType,
    accountId: account.id,
    email: account.email.toLowerCase(),
    codeHash: hashPassword(code),
    requestedByIp: ip,
    expiresAt,
  });

  const label = accountType === "provider" ? "service provider" : "customer";
  const mail = await sendMail({
    to: account.email,
    subject: `LocalFix SA ${label} password reset code`,
    text: `Hi ${account.name},\n\nYour LocalFix SA password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.\n\nLocalFix SA`,
    html: `<div style="font-family:Arial,sans-serif;color:#0c2f5f"><h2>LocalFix SA password reset</h2><p>Hi ${account.name},</p><p>Your ${label} password reset code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:6px;background:#f1f9f6;padding:16px;border-radius:12px;display:inline-block">${code}</p><p>This code expires in 15 minutes. If you did not request this, ignore this email.</p></div>`,
  });

  if (!mail.ok) return Response.json({ error: mail.error }, { status: 503 });

  return Response.json({
    ok: true,
    message: "A verification code has been sent to the registered email address.",
  });
}
