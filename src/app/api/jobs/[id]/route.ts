import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  broadcasts,
  inboxMessages,
  jobCardCorrections,
  jobCards,
  jobMedia,
  jobSignatures,
  jobs,
  messages,
  payments,
  quotes,
} from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/jobs/[id]
 *
 * Customer-owned request deletion.
 *
 * A customer may delete a broadcast/open request only before choosing a
 * provider. Once a quote is accepted, payment created, or a Job Card exists,
 * the request is protected and must be resolved/cancelled through the
 * platform's normal support and financial workflows.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getCustomerSession();
  if (!session) {
    return Response.json({ error: "Sign in to manage this request." }, { status: 401 });
  }

  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return Response.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return Response.json({ error: "Request not found." }, { status: 404 });

  const ownsJob =
    job.customerId === session.id || job.customerEmail.toLowerCase() === session.email.toLowerCase();
  if (!ownsJob) {
    return Response.json({ error: "You can only delete your own requests." }, { status: 403 });
  }

  const [quoteRows, paymentRows, cardRows] = await Promise.all([
    db
      .select({ id: quotes.id, status: quotes.status })
      .from(quotes)
      .where(eq(quotes.jobId, jobId)),
    db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(eq(payments.jobId, jobId)),
    db.select({ id: jobCards.id }).from(jobCards).where(eq(jobCards.jobId, jobId)).limit(1),
  ]);

  const acceptedQuote =
    quoteRows.find((row) => row.id === job.acceptedQuoteId) ?? quoteRows.find((row) => row.status === "accepted");
  const payment = paymentRows.find((row) => !["failed", "cancelled"].includes(row.status));
  const card = cardRows[0] ?? null;

  if (acceptedQuote || payment || card) {
    return Response.json(
      {
        error:
          "This request cannot be deleted because a quotation has been accepted or the job has already progressed. Contact support for assistance.",
      },
      { status: 409 },
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(jobCardCorrections).where(eq(jobCardCorrections.jobId, jobId));
    await tx.delete(jobSignatures).where(eq(jobSignatures.jobId, jobId));
    await tx.delete(jobCards).where(eq(jobCards.jobId, jobId));
    await tx.delete(jobMedia).where(eq(jobMedia.jobId, jobId));
    await tx.delete(inboxMessages).where(eq(inboxMessages.jobId, jobId));
    await tx.delete(messages).where(eq(messages.jobId, jobId));
    await tx.delete(payments).where(eq(payments.jobId, jobId));
    await tx.delete(quotes).where(eq(quotes.jobId, jobId));
    await tx.delete(broadcasts).where(eq(broadcasts.jobId, jobId));
    await tx.delete(jobs).where(eq(jobs.id, jobId));
  });

  return Response.json({ ok: true, message: "Request deleted." });
}
