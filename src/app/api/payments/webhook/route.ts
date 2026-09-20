import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payments, walletTransactions } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/yoco";
import { applyWalletMovement } from "@/lib/wallet";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type YocoEvent = {
  id?: string;
  type?: string;
  payload?: {
    id?: string;
    status?: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  };
};

function metaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v ? v : null;
}

/**
 * POST /api/payments/webhook
 *
 * Yoco webhook endpoint. Receives payment.succeeded events.
 * - Job payments: marks payment as paid, job becomes "in_progress".
 * - Wallet top-ups: credits the customer wallet (idempotent).
 *
 * Always responds with JSON so Yoco gets a clean 2xx/4xx acknowledgement.
 */
export async function POST(request: Request) {
  try {
    await ready();

    const rawBody = await request.text();
    const signature = request.headers.get("yoco-signature") ?? request.headers.get("x-yoco-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("[Webhook] Invalid signature");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event: YocoEvent;
    try {
      event = JSON.parse(rawBody) as YocoEvent;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (event.type !== "payment.succeeded") {
      console.log(`[Webhook] Ignoring event type: ${event.type}`);
      return Response.json({ received: true, ignored: true });
    }

    const meta = event.payload?.metadata;
    const yocoPaymentId = event.payload?.id ?? null;
    // Yoco echoes our checkout metadata; match on several keys for robustness.
    const checkoutId = metaString(meta, "checkoutId");
    const reference =
      metaString(meta, "localfix_reference") ?? metaString(meta, "clientReferenceId") ?? metaString(meta, "externalId");

    if (!checkoutId && !reference) {
      console.error("[Webhook] No checkoutId or reference in metadata");
      return Response.json({ error: "Missing checkout reference" }, { status: 400 });
    }

    // ── Case 1: wallet top-up ──────────────────────────────────────────
    const topup = await findTopup(checkoutId, reference);

    if (topup) {
      if (topup.status === "completed") {
        return Response.json({ received: true, already_processed: true });
      }

      const movement = await applyWalletMovement({
        customerId: topup.customerId,
        amountCents: topup.amountCents,
        type: "topup",
        description: "Wallet top-up via Yoco",
        reference: topup.reference,
        yocoCheckoutId: checkoutId ?? topup.yocoCheckoutId ?? null,
      });

      await db.delete(walletTransactions).where(eq(walletTransactions.id, topup.id));

      console.log(
        `[Webhook] Wallet top-up ${topup.reference} credited ` +
          `R${(topup.amountCents / 100).toFixed(2)} — new balance R${(movement.balanceCents / 100).toFixed(2)}`,
      );
      return Response.json({ received: true, wallet_topup: true, balanceCents: movement.balanceCents });
    }

    // ── Case 2: job payment ────────────────────────────────────────────
    const payment = await findPayment(checkoutId, reference);
    if (!payment) {
      console.error(`[Webhook] No payment found for checkout ${checkoutId ?? reference}`);
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "paid" || payment.status === "paid_out") {
      return Response.json({ received: true, already_processed: true });
    }

    await db
      .update(payments)
      .set({
        status: "paid",
        yocoPaymentId,
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

    await db.update(jobs).set({ status: "in_progress" }).where(eq(jobs.id, payment.jobId));

    console.log(
      `[Webhook] Payment ${payment.reference} marked as paid. ` +
        `Total: R${(payment.totalAmountCents / 100).toFixed(2)}, ` +
        `Commission: R${(payment.commissionCents / 100).toFixed(2)}, ` +
        `Provider payout: R${(payment.providerPayoutCents / 100).toFixed(2)}`,
    );

    return Response.json({ received: true, payment_id: payment.id });
  } catch (err) {
    console.error("[Webhook] unexpected error:", err);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

async function findTopup(checkoutId: string | null, reference: string | null) {
  if (checkoutId) {
    const [row] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.yocoCheckoutId, checkoutId))
      .limit(1);
    if (row) return row;
  }
  if (reference) {
    const [row] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.reference, reference))
      .limit(1);
    if (row) return row;
  }
  return null;
}

async function findPayment(checkoutId: string | null, reference: string | null) {
  if (checkoutId) {
    const [row] = await db.select().from(payments).where(eq(payments.yocoCheckoutId, checkoutId)).limit(1);
    if (row) return row;
  }
  if (reference) {
    const [row] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
    if (row) return row;
  }
  return null;
}
