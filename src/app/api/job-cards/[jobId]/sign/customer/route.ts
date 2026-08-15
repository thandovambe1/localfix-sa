import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inboxMessages, jobCards, jobSignatures, jobs, providers } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { sendJobCardCompletedEmail, sendJobCardCustomerSignedEmail } from "@/lib/email";
import {
  CUSTOMER_CONFIRMATION,
  finalIntegrityHash,
  getJobCardBundle,
  requestMetadata,
  validateSignatureData,
} from "@/lib/job-cards";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Customer login required." }, { status: 401 });

  const { jobId: raw } = await params;
  const jobId = Number(raw);
  const bundle = await getJobCardBundle(jobId);
  if (!bundle?.card || !bundle.providerSignature || !bundle.provider || !bundle.customer) {
    return Response.json({ error: "The provider must complete and sign the Job Card first." }, { status: 400 });
  }
  if (
    bundle.card.customerId !== session.id ||
    (bundle.job.customerId !== session.id && bundle.job.customerEmail.toLowerCase() !== session.email.toLowerCase())
  ) {
    return Response.json({ error: "This Job Card does not belong to your account." }, { status: 403 });
  }
  if (bundle.card.locked || bundle.card.status === "completed" || bundle.customerSignature) {
    return Response.json({ error: "The customer signature was already submitted and the Job Card is locked." }, { status: 409 });
  }
  if (bundle.card.status !== "awaiting_customer_signature") {
    return Response.json({ error: "This Job Card is not awaiting the customer signature." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const signerName = String(body.signerName ?? "").trim();
  const confirmed = body.confirmed === true;
  const signatureData = body.signatureData;

  if (signerName.length < 2) return Response.json({ error: "Enter your name." }, { status: 400 });
  if (!confirmed) return Response.json({ error: "Confirm that you reviewed and acknowledge the Job Card." }, { status: 400 });
  if (!validateSignatureData(signatureData)) {
    return Response.json({ error: "Draw a valid signature in the signature pad." }, { status: 400 });
  }

  const meta = requestMetadata(request);
  let completedCard;
  try {
    completedCard = await db.transaction(async (tx) => {
      const [customerSignature] = await tx
        .insert(jobSignatures)
        .values({
          jobCardId: bundle.card!.id,
          jobId,
          signerId: session.id,
          signerRole: "customer",
          signerName,
          signatureData,
          confirmationText: CUSTOMER_CONFIRMATION,
          ...meta,
        })
        .returning();

      const hash = finalIntegrityHash({
        job: bundle.job,
        card: bundle.card!,
        providerSignature: bundle.providerSignature!,
        customerSignature,
      });
      const completedAt = new Date();

      const [card] = await tx
        .update(jobCards)
        .set({
          status: "completed",
          locked: true,
          integrityHash: hash,
          completedAt,
          updatedAt: completedAt,
        })
        .where(eq(jobCards.id, bundle.card!.id))
        .returning();

      await tx.update(jobs).set({ status: "completed" }).where(eq(jobs.id, jobId));
      await tx
        .update(providers)
        .set({ jobsCompleted: sql`${providers.jobsCompleted} + 1` })
        .where(eq(providers.id, bundle.card!.providerId));

      await tx.insert(inboxMessages).values({
        customerId: session.id,
        customerEmail: bundle.job.customerEmail,
        type: "system",
        title: "Signed Job Card Available",
        body: `Both electronic signatures are complete. Job Card ${bundle.card!.documentReference} is now locked and available to view or download.`,
        jobId,
      });
      return card;
    });
  } catch (error) {
    console.error("[job-card] customer signature save failed", error);
    return Response.json({ error: "The signature could not be saved, or it was already submitted." }, { status: 409 });
  }

  // Existing payments and payout records are intentionally not changed here.
  void sendJobCardCustomerSignedEmail({
    to: bundle.provider.email,
    providerName: bundle.provider.businessName,
    jobReference: bundle.job.reference,
    jobId,
  });
  void sendJobCardCompletedEmail({
    to: bundle.provider.email,
    recipientName: bundle.provider.businessName,
    jobReference: bundle.job.reference,
    documentReference: completedCard.documentReference,
    jobId,
  });
  void sendJobCardCompletedEmail({
    to: bundle.job.customerEmail,
    recipientName: bundle.job.customerName,
    jobReference: bundle.job.reference,
    documentReference: completedCard.documentReference,
    jobId,
  });

  return Response.json({
    ok: true,
    status: "completed",
    documentReference: completedCard.documentReference,
    integrityHash: completedCard.integrityHash,
  });
}
