import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payments, quotes } from "@/db/schema";
import { calculateCommission, paymentReference } from "@/lib/commission";
import { createYocoCheckout } from "@/lib/yoco";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 *
 * Creates a Yoco checkout session for an accepted quote.
 * The customer pays the full quote amount; LocalFix SA keeps 13% commission.
 *
 * Body: { quoteId: number }
 */
export async function POST(request: Request) {
  await ready();

  const body = (await request.json().catch(() => ({}))) as { quoteId?: number };
  const quoteId = Number(body.quoteId);
  if (!quoteId) {
    return Response.json({ error: "quoteId is required" }, { status: 400 });
  }

  // Load the accepted quote
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) {
    return Response.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.status !== "accepted") {
    return Response.json({ error: "Quote must be accepted before payment" }, { status: 400 });
  }

  // Load the job
  const [job] = await db.select().from(jobs).where(eq(jobs.id, quote.jobId)).limit(1);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  // Calculate commission split
  const commission = calculateCommission(quote.amount);
  const ref = paymentReference();

  // Create Yoco checkout session
  const result = await createYocoCheckout({
    amountCents: commission.totalCents,
    reference: ref,
    jobId: job.id,
    quoteId: quote.id,
    providerId: quote.providerId,
    commissionCents: commission.commissionCents,
    providerPayoutCents: commission.providerPayoutCents,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  // Record payment in our ledger
  const [payment] = await db
    .insert(payments)
    .values({
      jobId: job.id,
      quoteId: quote.id,
      providerId: quote.providerId,
      totalAmountCents: commission.totalCents,
      commissionCents: commission.commissionCents,
      providerPayoutCents: commission.providerPayoutCents,
      commissionRate: commission.rate.toFixed(4),
      yocoCheckoutId: result.checkout.id,
      yocoRedirectUrl: result.checkout.redirectUrl,
      reference: ref,
      status: "pending",
      meta: { checkout: result.checkout },
    })
    .returning();

  // Update job status
  await db.update(jobs).set({ status: "payment_pending" }).where(eq(jobs.id, job.id));

  return Response.json({
    payment: {
      id: payment.id,
      reference: payment.reference,
      totalAmountCents: payment.totalAmountCents,
      commissionCents: payment.commissionCents,
      providerPayoutCents: payment.providerPayoutCents,
      commissionRate: `${Math.round(commission.rate * 100)}%`,
    },
    redirectUrl: result.checkout.redirectUrl,
    breakdown: commission.display,
  });
}
