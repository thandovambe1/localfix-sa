import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inboxMessages, jobCards, jobSignatures, jobs } from "@/db/schema";
import { getProviderSession } from "@/lib/auth";
import { sendJobCardAwaitingCustomerEmail } from "@/lib/email";
import {
  getJobCardBundle,
  PROVIDER_CONFIRMATION,
  requestMetadata,
  validateSignatureData,
} from "@/lib/job-cards";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const session = await getProviderSession();
  if (!session) return Response.json({ error: "Provider login required." }, { status: 401 });

  const { jobId: raw } = await params;
  const jobId = Number(raw);
  const bundle = await getJobCardBundle(jobId);
  if (!bundle?.card || !bundle.quote || !bundle.provider || !bundle.customer) {
    return Response.json({ error: "Complete the Job Card before signing." }, { status: 400 });
  }
  if (bundle.card.providerId !== session.id || bundle.quote.providerId !== session.id) {
    return Response.json({ error: "You are not the accepted provider for this job." }, { status: 403 });
  }
  if (bundle.card.locked || bundle.card.status === "completed") {
    return Response.json({ error: "This Job Card is already completed and locked." }, { status: 409 });
  }
  if (bundle.providerSignature) {
    return Response.json({ error: "The provider signature has already been submitted." }, { status: 409 });
  }
  if (bundle.card.status !== "awaiting_provider_signature") {
    return Response.json({ error: "This Job Card is not awaiting the provider signature." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const signerName = String(body.signerName ?? "").trim();
  const confirmed = body.confirmed === true;
  const signatureData = body.signatureData;

  if (signerName.length < 2) return Response.json({ error: "Enter your legal/display name." }, { status: 400 });
  if (!confirmed) return Response.json({ error: "Confirm that the work described has been completed." }, { status: 400 });
  if (!validateSignatureData(signatureData)) {
    return Response.json({ error: "Draw a valid signature in the signature pad." }, { status: 400 });
  }

  const meta = requestMetadata(request);
  let signature;
  try {
    signature = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(jobSignatures)
        .values({
          jobCardId: bundle.card!.id,
          jobId,
          signerId: session.id,
          signerRole: "provider",
          signerName,
          signatureData,
          confirmationText: PROVIDER_CONFIRMATION,
          ...meta,
        })
        .returning();

      await tx
        .update(jobCards)
        .set({ status: "awaiting_customer_signature", updatedAt: new Date() })
        .where(eq(jobCards.id, bundle.card!.id));
      await tx.update(jobs).set({ status: "awaiting_customer_signature" }).where(eq(jobs.id, jobId));

      await tx.insert(inboxMessages).values({
        customerId: bundle.customer!.id,
        customerEmail: bundle.job.customerEmail,
        type: "system",
        title: "Job Card Awaiting Your Signature",
        body: `The provider has signed Job Card ${bundle.card!.documentReference}. Review the work, materials, photos and amount, then add your own electronic signature.`,
        jobId,
      });
      return created;
    });
  } catch (error) {
    console.error("[job-card] provider signature save failed", error);
    return Response.json({ error: "The signature could not be saved, or it was already submitted." }, { status: 409 });
  }

  void sendJobCardAwaitingCustomerEmail({
    to: bundle.job.customerEmail,
    customerName: bundle.job.customerName,
    jobReference: bundle.job.reference,
    jobId,
  });

  return Response.json({ ok: true, signature, status: "awaiting_customer_signature" }, { status: 201 });
}
