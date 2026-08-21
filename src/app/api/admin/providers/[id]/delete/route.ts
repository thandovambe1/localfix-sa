import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  broadcasts,
  inboxMessages,
  jobCards,
  jobs,
  messages,
  passwordResetCodes,
  payments,
  providerDocuments,
  providers,
  quotes,
  reviews,
} from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Founder-only provider account deletion.
 *
 * Removes the provider's account, login access, compliance documents,
 * broadcasts, reviews and non-historical quotes/messages. Completed signed
 * Job Cards and settled financial records are retained as immutable audit
 * records, but become detached from any active provider account/profile.
 *
 * Deletion is blocked while the provider has an active accepted assignment,
 * an unsettled payment/payout, or an unlocked Job Card. Those obligations
 * must be resolved first so customer and financial records are not corrupted.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "owner") {
    return Response.json({ error: "Only the Founder can permanently delete a service provider." }, { status: 403 });
  }

  const { id } = await params;
  const providerId = Number(id);
  if (!Number.isInteger(providerId) || providerId <= 0) {
    return Response.json({ error: "Invalid provider ID." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { confirmBusinessName?: string };
  const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
  if (!provider) return Response.json({ error: "Provider not found." }, { status: 404 });

  if (String(body.confirmBusinessName ?? "").trim() !== provider.businessName) {
    return Response.json(
      { error: "Type the exact business name to confirm permanent deletion." },
      { status: 400 },
    );
  }

  const providerQuotes = await db.select().from(quotes).where(eq(quotes.providerId, providerId));
  const quoteIds = providerQuotes.map((quote) => quote.id);

  const [providerPayments, providerCards] = await Promise.all([
    db.select().from(payments).where(eq(payments.providerId, providerId)),
    db.select().from(jobCards).where(eq(jobCards.providerId, providerId)),
  ]);

  const acceptedJobs = quoteIds.length
    ? await db.select().from(jobs).where(inArray(jobs.acceptedQuoteId, quoteIds))
    : [];
  const activeJobs = acceptedJobs.filter((job) => job.status !== "completed");
  const unsettledPayments = providerPayments.filter(
    (payment) =>
      !["failed", "refunded"].includes(payment.status) &&
      payment.payoutStatus !== "completed",
  );
  const unlockedCards = providerCards.filter((card) => !card.locked);

  if (activeJobs.length || unsettledPayments.length || unlockedCards.length) {
    return Response.json(
      {
        error:
          "This provider still has active obligations. Resolve or refund active jobs/payments and finish or cancel unlocked Job Cards before permanent deletion.",
        blockers: {
          activeJobs: activeJobs.map((job) => ({ id: job.id, reference: job.reference, status: job.status })),
          unsettledPayments: unsettledPayments.map((payment) => ({
            id: payment.id,
            reference: payment.reference,
            status: payment.status,
            payoutStatus: payment.payoutStatus,
          })),
          unlockedJobCards: unlockedCards.map((card) => ({
            id: card.id,
            documentReference: card.documentReference,
            status: card.status,
          })),
        },
      },
      { status: 409 },
    );
  }

  const protectedQuoteIds = new Set<number>([
    ...providerPayments.map((payment) => payment.quoteId),
    ...providerCards.map((card) => card.quoteId),
    ...acceptedJobs.filter((job) => job.status === "completed").map((job) => job.acceptedQuoteId).filter((id): id is number => id !== null),
  ]);
  const deletableQuoteIds = quoteIds.filter((quoteId) => !protectedQuoteIds.has(quoteId));
  const protectedJobIds = new Set<number>([
    ...providerPayments.map((payment) => payment.jobId),
    ...providerCards.map((card) => card.jobId),
    ...acceptedJobs.filter((job) => job.status === "completed").map((job) => job.id),
  ]);

  await db.transaction(async (tx) => {
    if (deletableQuoteIds.length) {
      await tx.delete(inboxMessages).where(inArray(inboxMessages.quoteId, deletableQuoteIds));
      await tx.delete(quotes).where(inArray(quotes.id, deletableQuoteIds));
    }

    await tx.delete(broadcasts).where(eq(broadcasts.providerId, providerId));
    await tx.delete(reviews).where(eq(reviews.providerId, providerId));
    await tx.delete(providerDocuments).where(eq(providerDocuments.providerId, providerId));
    await tx
      .delete(passwordResetCodes)
      .where(and(eq(passwordResetCodes.accountType, "provider"), eq(passwordResetCodes.accountId, providerId)));

    if (protectedJobIds.size) {
      await tx
        .delete(messages)
        .where(and(eq(messages.providerId, providerId), notInArray(messages.jobId, [...protectedJobIds])));
    } else {
      await tx.delete(messages).where(eq(messages.providerId, providerId));
    }

    await tx.delete(providers).where(eq(providers.id, providerId));

    await tx.insert(auditLogs).values({
      actor: session.email,
      action: "provider.permanently_deleted",
      target: `provider:${providerId}`,
      detail: JSON.stringify({
        businessName: provider.businessName,
        email: provider.email,
        deletedDocuments: true,
        deletedBroadcasts: true,
        deletedReviews: true,
        deletedNonHistoricalQuotes: deletableQuoteIds.length,
        retainedHistoricalPayments: providerPayments.length,
        retainedLockedJobCards: providerCards.length,
      }),
    });
  });

  return Response.json({
    ok: true,
    message: `${provider.businessName} has been permanently removed from the active LocalFix SA platform.`,
    retainedForAudit: {
      payments: providerPayments.length,
      lockedJobCards: providerCards.length,
      protectedQuotes: protectedQuoteIds.size,
    },
  });
}
