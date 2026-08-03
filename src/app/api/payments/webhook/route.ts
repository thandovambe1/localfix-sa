import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payments, walletTransactions } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/yoco";
import { applyWalletMovement } from "@/lib/wallet";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook
 *
 * Yoco webhook endpoint. Receives payment.succeeded events.
 * On success: marks payment as paid, updates job to "in_progress",
 * and queues provider payout.
 */
export async function POST(request: Request) {
  await ready();

  const rawBody = await request.text();
  const signature = request.headers.get("yoco-signature") ?? request.headers.get("x-yoco-signature");

  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[Webhook] Invalid signature");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    id?: string;
    type?: string;
    payload?: {
      id?: string;
      status?: string;
      amount?: number;
      metadata?: Record<string, string>;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process payment.succeeded events
  if (event.type !== "payment.succeeded") {
    console.log(`[Webhook] Ignoring event type: ${event.type}`);
    return Response.json({ received: true, ignored: true });
  }

  const checkoutId = event.payload?.metadata?.checkoutId;
  const yocoPaymentId = event.payload?.id;

  if (!checkoutId) {
    console.error("[Webhook] No checkoutId in metadata");
    return Response.json({ error: "Missing checkoutId" }, { status: 400 });
  }

  // A checkout is either a job payment or a wallet top-up.
  const [pendingTopup] = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.yocoCheckoutId, checkoutId))
    .limit(1);

  if (pendingTopup) {
    if (pendingTopup.status === "completed") {
      return Response.json({ received: true, already_processed: true });
    }

    const movement = await applyWalletMovement({
      customerId: pendingTopup.customerId,
      amountCents: pendingTopup.amountCents,
      type: "topup",
      description: "Wallet top-up via Yoco",
      reference: pendingTopup.reference,
      yocoCheckoutId: checkoutId,
    });

    // Retire the pending placeholder now that the credit has landed.
    await db.delete(walletTransactions).where(eq(walletTransactions.id, pendingTopup.id));

    console.log(
      `[Webhook] Wallet top-up ${pendingTopup.reference} credited ` +
        `R${(pendingTopup.amountCents / 100).toFixed(2)} — new balance R${(movement.balanceCents / 100).toFixed(2)}`,
    );
    return Response.json({ received: true, wallet_topup: true, balanceCents: movement.balanceCents });
  }

  // Find the payment record by Yoco checkout ID
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.yocoCheckoutId, checkoutId))
    .limit(1);

  if (!payment) {
    console.error(`[Webhook] No payment found for checkout ${checkoutId}`);
    return Response.json({ error: "Payment not found" }, { status: 404 });
  }

  // Idempotency: skip if already processed
  if (payment.status === "paid" || payment.status === "paid_out") {
    return Response.json({ received: true, already_processed: true });
  }

  // Mark payment as paid
  await db
    .update(payments)
    .set({
      status: "paid",
      yocoPaymentId: yocoPaymentId ?? null,
      paidAt: new Date(),
      payoutStatus: "payout_pending",
      meta: {
        ...((payment.meta ?? {}) as Record<string, unknown>),
        webhook_event_id: event.id,
        webhook_event_type: event.type,
        payment_amount: event.payload?.amount,
      },
    })
    .where(eq(payments.id, payment.id));

  // Update job status to in_progress (provider can now begin work)
  await db
    .update(jobs)
    .set({ status: "in_progress" })
    .where(eq(jobs.id, payment.jobId));

  console.log(
    `[Webhook] Payment ${payment.reference} marked as paid. ` +
      `Total: R${(payment.totalAmountCents / 100).toFixed(2)}, ` +
      `Commission: R${(payment.commissionCents / 100).toFixed(2)}, ` +
      `Provider payout: R${(payment.providerPayoutCents / 100).toFixed(2)}`,
  );

  return Response.json({ received: true, payment_id: payment.id });
}
