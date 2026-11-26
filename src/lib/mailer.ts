import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";

export type EmailCategory =
  | "job"
  | "quote"
  | "provider_application"
  | "job_card"
  | "password"
  | "payment"
  | "admin"
  | "general";

export type QueueEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: EmailCategory;
  reference?: string;
};

export type QueueEmailResult =
  | { ok: true; queued: true; id: number; delivered: boolean }
  | { ok: false; error: string };

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    requireTLS: String(process.env.SMTP_SECURE ?? "false") !== "true",
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "LocalFix SA <no-reply@localfix.co.za>";
}

/**
 * Deliver one outbox row. Returns true on success, false on failure.
 * State is updated so the admin dashboard can see delivered/failed emails.
 */
export async function deliverEmailRow(id: number): Promise<boolean> {
  const [row] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).limit(1);
  if (!row || row.status === "sent") return false;

  if (!configured()) {
    await db
      .update(emailOutbox)
      .set({
        status: "failed",
        attempts: row.attempts + 1,
        lastError: "SMTP not configured",
        nextRetryAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      .where(eq(emailOutbox.id, id));
    return false;
  }

  try {
    await transporter().sendMail({
      from: fromAddress(),
      to: row.toEmail,
      subject: row.subject,
      text: row.textBody,
      html: row.htmlBody ?? undefined,
    });

    await db
      .update(emailOutbox)
      .set({ status: "sent", attempts: row.attempts + 1, sentAt: new Date(), lastError: null })
      .where(eq(emailOutbox.id, id));
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown SMTP error";
    const attempts = row.attempts + 1;
    const backoffMs = Math.min(24 * 60 * 60 * 1000, 5 * 60 * 1000 * 2 ** Math.min(attempts, 6));
    await db
      .update(emailOutbox)
      .set({
        status: attempts >= 5 ? "failed" : "pending",
        attempts,
        lastError: message.slice(0, 1000),
        nextRetryAt: new Date(Date.now() + backoffMs),
      })
      .where(eq(emailOutbox.id, id));
    console.error(`[mailer] delivery failed for ${id}: ${message}`);
    return false;
  }
}

/**
 * Queue an email durably and attempt immediate delivery.
 * Even if SMTP is down, the email is saved and retried later — it is never lost.
 */
export async function queueEmail(input: QueueEmailInput): Promise<QueueEmailResult> {
  try {
    const [row] = await db
      .insert(emailOutbox)
      .values({
        toEmail: input.to,
        subject: input.subject,
        textBody: input.text,
        htmlBody: input.html ?? null,
        category: input.category ?? "general",
        reference: input.reference ?? "",
      })
      .returning();

    const delivered = configured() ? await deliverEmailRow(row.id) : false;
    return { ok: true, queued: true, id: row.id, delivered };
  } catch (err) {
    console.error("[mailer] could not queue email", err);
    return { ok: false, error: err instanceof Error ? err.message : "Could not queue email" };
  }
}

/**
 * Retry due pending emails. Safe to call from any request or cron route.
 */
export async function retryPendingEmails(limit = 20): Promise<{ processed: number; delivered: number }> {
  const due = await db
    .select({ id: emailOutbox.id })
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.status, "pending"),
        or(isNull(emailOutbox.nextRetryAt), lte(emailOutbox.nextRetryAt, new Date())),
      ),
    )
    .orderBy(asc(emailOutbox.createdAt))
    .limit(limit);

  let delivered = 0;
  for (const row of due) {
    if (await deliverEmailRow(row.id)) delivered += 1;
  }
  return { processed: due.length, delivered };
}

export { configured as smtpConfigured, fromAddress as emailFromAddress };
