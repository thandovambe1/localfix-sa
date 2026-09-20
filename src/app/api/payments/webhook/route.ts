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

  // Verify webhook signature using Yoco's Standard Webhooks scheme
  // (webhook-id, webhook-timestamp, webhook-signature headers).
  if (
    !verifyWebhookSignature(rawBody, {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    })
  ) {
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

  const metaKind = String((event.payload as { metadata?: Record<string, unknown> })?.metadata?.kind ?? "");
  const isWalletTopup = Boolean(pendingTopup) || metaKind === "wallet_topup";

  if (isWalletTopup) {
    if (pendingTopup?.status === "completed") {
      return Response.json({ received: true, already_processed: true });
    }

    const payload = event.payload as { amount?: number; metadata?: Record<string, unknown> };
    const amountCents = pendingTopup?.amountCents ?? Number(payload.amount ?? 0);
    const customerId = Number(
      pendingTopup?.customerId ?? String(payload.metadata?.customer_id ?? ""),
    );
    const reference = String(payload.metadata?.localfix_reference ?? pendingTopup?.reference ?? `WLT-${Date.now()}`);

    if (!customerId || !amountCents) {
      console.error("[Webhook] Wallet top-up webhook missing customer/amount", checkoutId);
      return Response.json({ error: "Wallet top-up webhook missing data" }, { status: 400 });
    }

    // Credit the wallet (or reconcile a lost pending ledger row).
    const movement = await applyWalletMovement({
      customerId,
      amountCents,
      type: "topup",
      description: "Wallet top-up via Yoco",
      reference,
      yocoCheckoutId: checkoutId,
    });

    // Retire the pending placeholder if it existed.
    if (pendingTopup) {
      await db.delete(walletTransactions).where(eq(walletTransactions.id, pendingTopup.id));
    }

    console.log(
      `[Webhook] Wallet top-up ${reference} credited ` +
        `R${(amountCents / 100).toFixed(2)} — new balance R${(movement.balanceCents / 100).toFixed(2)}`,
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
