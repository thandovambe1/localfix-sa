import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  jobCardCorrections,
  jobCards,
  jobSignatures,
  jobs,
  payments,
  providers,
  quotes,
  type Job,
  type JobCard,
  type JobSignature,
} from "@/db/schema";
import { getAdminSession, getCustomerSession, getProviderSession } from "@/lib/auth";

export const PROVIDER_CONFIRMATION = "I confirm that the work described above has been completed.";
export const CUSTOMER_CONFIRMATION =
  "I confirm that I have reviewed the job card and acknowledge completion of the work described.";

export type JobCardActor =
  | { role: "admin"; id: number; name: string; email: string }
  | { role: "provider"; id: number; name: string; email: string }
  | { role: "customer"; id: number; name: string; email: string };

export function jobCardReference(jobReference: string) {
  return `LFX-JC-${jobReference.replace(/[^A-Z0-9]/gi, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function getAcceptedJobContext(jobId: number) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return null;

  let acceptedQuote = null;
  if (job.acceptedQuoteId) {
    [acceptedQuote] = await db.select().from(quotes).where(eq(quotes.id, job.acceptedQuoteId)).limit(1);
  }
  if (!acceptedQuote) {
    [acceptedQuote] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.jobId, jobId), eq(quotes.status, "accepted")))
      .limit(1);
  }
  if (!acceptedQuote) return { job, quote: null, provider: null, customer: null, payment: null };

  const [[provider], [customer], paymentRows] = await Promise.all([
    db.select().from(providers).where(eq(providers.id, acceptedQuote.providerId)).limit(1),
    job.customerId
      ? db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1)
      : Promise.resolve([]),
    db.select().from(payments).where(eq(payments.jobId, jobId)).limit(1),
  ]);

  return {
    job,
    quote: acceptedQuote,
    provider: provider ?? null,
    customer: customer ?? null,
    payment: paymentRows[0] ?? null,
  };
}

export async function getJobCardBundle(jobId: number) {
  const context = await getAcceptedJobContext(jobId);
  if (!context) return null;

  const [card] = await db.select().from(jobCards).where(eq(jobCards.jobId, jobId)).limit(1);
  const [signatures, corrections] = card
    ? await Promise.all([
        db.select().from(jobSignatures).where(eq(jobSignatures.jobCardId, card.id)).orderBy(asc(jobSignatures.signedAt)),
        db
          .select()
          .from(jobCardCorrections)
          .where(eq(jobCardCorrections.jobCardId, card.id))
          .orderBy(asc(jobCardCorrections.createdAt)),
      ])
    : [[], []];

  return {
    ...context,
    card: card ?? null,
    signatures,
    providerSignature: signatures.find((s) => s.signerRole === "provider") ?? null,
    customerSignature: signatures.find((s) => s.signerRole === "customer") ?? null,
    corrections,
  };
}

/** Resolve and authorize the current session for a job card. */
export async function authorizeJobCard(job: Job, card?: JobCard | null): Promise<JobCardActor | null> {
  const admin = await getAdminSession();
  if (admin && (admin.role === "owner" || admin.role === "admin")) {
    return { role: "admin", id: admin.id, name: admin.name, email: admin.email };
  }

  const provider = await getProviderSession();
  if (provider) {
    const providerId = card?.providerId;
    if (providerId === provider.id) {
      return { role: "provider", id: provider.id, name: provider.name, email: provider.email };
    }
    if (!card) {
      const context = await getAcceptedJobContext(job.id);
      if (context?.quote?.providerId === provider.id) {
        return { role: "provider", id: provider.id, name: provider.name, email: provider.email };
      }
    }
  }

  const customer = await getCustomerSession();
  if (
    customer &&
    (job.customerId === customer.id || job.customerEmail.toLowerCase() === customer.email.toLowerCase())
  ) {
    return { role: "customer", id: customer.id, name: customer.name, email: customer.email };
  }

  return null;
}

export function validateSignatureData(data: unknown): data is string {
  if (typeof data !== "string") return false;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!match) return false;
  try {
    const bytes = Buffer.from(match[1], "base64");
    return bytes.length >= 150 && bytes.length <= 300 * 1024;
  } catch {
    return false;
  }
}

function signatureDigest(signature: JobSignature) {
  return createHash("sha256").update(signature.signatureData).digest("hex");
}

/** Hash the immutable signed payload; corrections are deliberately excluded. */
export function finalIntegrityHash(input: {
  job: Job;
  card: JobCard;
  providerSignature: JobSignature;
  customerSignature: JobSignature;
}) {
  const payload = JSON.stringify({
    documentReference: input.card.documentReference,
    jobId: input.job.id,
    jobReference: input.job.reference,
    originalDescription: input.job.description,
    serviceAddress: input.job.address,
    workCompleted: input.card.workCompleted,
    materialsUsed: input.card.materialsUsed,
    additionalNotes: input.card.additionalNotes,
    completionPhotos: input.card.completionPhotos,
    finalAmountCents: input.card.finalAmountCents,
    provider: {
      id: input.providerSignature.signerId,
      name: input.providerSignature.signerName,
      signedAt: input.providerSignature.signedAt.toISOString(),
      signatureHash: signatureDigest(input.providerSignature),
    },
    customer: {
      id: input.customerSignature.signerId,
      name: input.customerSignature.signerName,
      signedAt: input.customerSignature.signedAt.toISOString(),
      signatureHash: signatureDigest(input.customerSignature),
    },
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function requestMetadata(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  };
}
