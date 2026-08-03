import { randomInt } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminPasswordCodes, adminUsers, auditLogs } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { founderEmail, sendMail } from "@/lib/email";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

function code6() {
  return String(randomInt(100000, 1000000));
}

export async function POST(request: Request) {
  await ready();

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return Response.json({ error: "Enter a valid admin email address." }, { status: 400 });

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  // Generic response for unknown emails — don't leak whether an account exists.
  if (!admin || !admin.active) {
    return Response.json({
      ok: true,
      message: "If that admin account exists, a verification code has been sent to the founder.",
    });
  }

  // Throttle: max 3 active unused codes in 30 minutes.
  const recent = await db
    .select({ id: adminPasswordCodes.id })
    .from(adminPasswordCodes)
    .where(
      sql`${adminPasswordCodes.adminUserId} = ${admin.id}
        and ${adminPasswordCodes.used} = false
        and ${adminPasswordCodes.createdAt} > now() - interval '30 minutes'`,
    )
    .orderBy(desc(adminPasswordCodes.createdAt));

  if (recent.length >= 3) {
    return Response.json(
      { error: "Too many code requests. Please wait before requesting another code." },
      { status: 429 },
    );
  }

  const code = code6();
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;

  await db.insert(adminPasswordCodes).values({
    adminUserId: admin.id,
    adminEmail: admin.email,
    codeHash: hashPassword(code),
    purpose: "password_change",
    requestedByIp: ip,
    expiresAt,
  });

  const to = founderEmail();
  const subject = `LocalFix SA admin password code for ${admin.email}`;
  const text = [
    `A password change code was requested for ${admin.name} (${admin.email}).`,
    `Role: ${admin.role}`,
    `Verification code: ${code}`,
    `This code expires in 15 minutes.`,
    `Only share it with the verified staff member if you approve this password change.`,
  ].join("\n");

  const mail = await sendMail({
    to,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;color:#0c2f5f"><h2>LocalFix SA Admin Password Code</h2><p>Password change requested for <strong>${admin.email}</strong> (${admin.role}).</p><p style="font-size:28px;font-weight:800;letter-spacing:6px;background:#f1f9f6;padding:16px;border-radius:12px;display:inline-block">${code}</p><p>This code expires in 15 minutes. Only share it if you approve.</p></div>`,
  });

  if (!mail.ok) {
    return Response.json({ error: mail.error }, { status: 503 });
  }

  await db.insert(auditLogs).values({
    actor: admin.email,
    action: "admin.password_code_requested",
    target: `admin_user:${admin.id}`,
    detail: `Password change code sent to founder ${to}`,
  });

  return Response.json({
    ok: true,
    message: `A verification code has been sent to the founder (${to}). Get the code from the founder to continue.`,
  });
}
