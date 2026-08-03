import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, jobs, payments, quotes } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { calculateCommission, paymentReference } from "@/lib/commission";
import { applyWalletMovement } from "@/lib/wallet";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/pay — settle an accepted quote using the wallet balance.
 * The platform still retains its 13% commission; the provider payout is queued.
 * body: { quoteId: number }
 */
export async function POST(request: Request) {
  await ready();

  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Please sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { quoteId?: number };
  const quoteId = Number(body.quoteId);
  if (!quoteId) return Response.json({ error: "quoteId is required" }, { status: 400 });

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return Response.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "accepted") {
    return Response.json({ error: "Quote must be accepted before payment" }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, quote.jobId)).limit(1);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

  const [customer] = await db.select().from(customers).where(eq(customers.id, session.id)).limit(1);
  if (!customer) return Response.json({ error: "Account not found" }, { status: 404 });

  const commission = calculateCommission(quote.amount);

  if (customer.walletCents < commission.totalCents) {
    return Response.json(
      {
        error: "Insufficient wallet balance",
        shortfallCents: commission.totalCents - customer.walletCents,
        balanceCents: customer.walletCents,
      },
      { status: 400 },
    );
  }

  const reference = paymentReference();

  // Debit the wallet (throws if it would overdraw).
  let balanceCents: number;
  try {
    const movement = await applyWalletMovement({
      customerId: customer.id,
      amountCents: -commission.totalCents,
      type: "payment",
      description: `Payment for "${job.title}" (${job.reference})`,
      jobId: job.id,
    });
    balanceCents = movement.balanceCents;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Wallet debit failed" },
      { status: 400 },
    );
  }

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
      reference,
      method: "wallet",
      status: "paid",
      payoutStatus: "payout_pending",
      paidAt: new Date(),
      meta: { source: "wallet", customerId: customer.id },
    })
    .returning();

  await db.update(jobs).set({ status: "in_progress" }).where(eq(jobs.id, job.id));

  return Response.json({
    ok: true,
    payment: { id: payment.id, reference: payment.reference },
    balanceCents,
    breakdown: commission.display,
  });
}
