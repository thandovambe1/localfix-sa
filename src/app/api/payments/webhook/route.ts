import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payments, walletTransactions } from "@/db/schema";
import { applyWalletMovement } from "@/lib/wallet";
import { ready } from "@/lib/queries";
import { formatZAR } from "@/lib/commission";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook
 *
 * Reconciles a completed Yoco payment into either:
 *   1. a wallet top-up   (matched by localfix_reference / checkout id), or
 *   2. a job payment      (matched by localfix_reference / checkout id).
 *
 * Reconciliation keys are deliberately resilient:
 *   - metadata.localfix_reference   (our own reference, known at creation)
 *   - metadata.checkoutId / checkout_id
 *   - the Yoco checkout id echoed by the gateway
 *
 * The endpoint is idempotent: repeated deliveries never double-credit.
 */
export async function POST(request: Request) {
  await ready();

  const rawBody = await request.text();

  // Signature verification is optional and configured via
  // YOCO_WEBHOOK_SECRET in src/lib/yoco.ts. We still parse defensively.
  let envelope: {
    id?: string;
    type?: string;
    payload?: Record<string, unknown> & {
      id?: string;
      status?: string;
      amount?: number;
      checkoutId?: string;
      checkout_id?: string;
      metadata?: Record<string, unknown>;
    };
  };

  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = String(envelope.type ?? "");
  const payload = envelope.payload ?? {};

  // Yoco Checkout emits checkout.succeeded and/or payment.succeeded
  // depending on API version. Accept both. Ignore everything else.
  const isSuccess =
    eventType === "payment.succeeded" ||
    eventType === "checkout.succeeded" ||
    eventType.endsWith(".succeeded");

  if (!isSuccess) {
    console.log(`[Webhook] Ignoring event type: ${eventType || "(unknown)"}`);
    return Response.json({ received: true, ignored: true });
  }

  const metadata = (payload.metadata ?? {}) as Record<string, string>;
  const checkoutId =
    metadata.checkoutId ??
    metadata.checkout_id ??
    (typeof payload.checkoutId === "string" ? payload.checkoutId : undefined) ??
    (typeof payload.checkout_id === "string" ? (payload.checkout_id as string) : undefined);
  const reference = metadata.localfix_reference ?? metadata.reference ?? "";
  const yocoPaymentId = payload.id;
  const paidAmountCents = typeof payload.amount === "number" ? payload.amount : null;

  if (!reference && !checkoutId) {
    console.error("[Webhook] No reference or checkoutId in payload", rawBody.slice(0, 500));
    return Response.json({ error: "Missing reference or checkoutId" }, { status: 400 });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 1) WALLET TOP-UP
  // Match by checkout id first, then by our local reference.
  // ─────────────────────────────────────────────────────────────────────
  const pendingTopups = checkoutId
    ? await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.yocoCheckoutId, checkoutId))
    : [];

  let pendingTopup = pendingTopups[0];

  if (!pendingTopup && reference) {
    const byRef = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.reference, reference),
          eq(walletTransactions.type, "topup"),
        ),
      );
    // Prefer a pending row, then any row for idempotency.
    pendingTopup = byRef.find((r) => r.status === "pending") ?? byRef[0];
  }

  if (pendingTopup) {
    // Already settled — idempotent no-op.
    const alreadyCredited = await db
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.customerId, pendingTopup.customerId),
          eq(walletTransactions.type, "topup"),
          eq(walletTransactions.status, "completed"),
          eq(walletTransactions.reference, pendingTopup.reference),
        ),
      );

    if (alreadyCredited.length) {
      // Retire the pending placeholder if it somehow survived.
      if (pendingTopup.status === "pending") {
        await db.delete(walletTransactions).where(eq(walletTransactions.id, pendingTopup.id));
      }
      return Response.json({ received: true, already_processed: true });
    }

    // Verify the paid amount matches the requested amount (in cents).
    if (paidAmountCents !== null && paidAmountCents !== pendingTopup.amountCents) {
      console.error(
        `[Webhook] Wallet amount mismatch for ${pendingTopup.reference}: ` +
          `expected ${pendingTopup.amountCents}, got ${paidAmountCents}`,
      );
      return Response.json(
        { error: "Paid amount does not match the wallet top-up amount." },
        { status: 400 },
      );
    }

    const movement = await applyWalletMovement({
      customerId: pendingTopup.customerId,
      amountCents: pendingTopup.amountCents,
      type: "topup",
      description: "Wallet top-up via Yoco",
      reference: pendingTopup.reference,
      yocoCheckoutId: checkoutId ?? pendingTopup.yocoCheckoutId ?? null,
    });

    // Retire the pending placeholder now that the credit has landed.
    if (pendingTopup.status === "pending") {
      await db.delete(walletTransactions).where(eq(walletTransactions.id, pendingTopup.id));
    }

    console.log(
      `[Webhook] Wallet top-up ${pendingTopup.reference} credited ` +
        `${formatZAR(pendingTopup.amountCents)} — balance ${formatZAR(movement.balanceCents)}`,
    );
    return Response.json({
      received: true,
      wallet_topup: true,
      reference: pendingTopup.reference,
      balanceCents: movement.balanceCents,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2) JOB PAYMENT
  // ─────────────────────────────────────────────────────────────────────
  const byCheckout = checkoutId
    ? await db.select().from(payments).where(eq(payments.yocoCheckoutId, checkoutId))
    : [];
  let payment = byCheckout[0];

  if (!payment && reference) {
    const byRef = await db.select().from(payments).where(eq(payments.reference, reference));
    payment = byRef[0];
  }

  if (!payment) {
    console.error(
      `[Webhook] No wallet top-up or payment found (ref=${reference ?? ""}, checkout=${checkoutId ?? ""})`,
    );
    return Response.json({ error: "Payment not found" }, { status: 404 });
  }

  // Idempotency
  if (payment.status === "paid" || payment.status === "paid_out") {
    return Response.json({ received: true, already_processed: true });
  }

  // Verify amount before marking paid.
  if (paidAmountCents !== null && paidAmountCents !== payment.totalAmountCents) {
    console.error(
      `[Webhook] Job amount mismatch for ${payment.reference}: ` +
        `expected ${payment.totalAmountCents}, got ${paidAmountCents}`,
    );
    return Response.json({ error: "Paid amount does not match the payment amount." }, { status: 400 });
  }

  await db
    .update(payments)
    .set({
      status: "paid",
      yocoPaymentId: yocoPaymentId ?? null,
      paidAt: new Date(),
      payoutStatus: "payout_pending",
      meta: {
        ...((payment.meta ?? {}) as Record<string, unknown>),
        webhook_event_id: envelope.id,
        webhook_event_type: eventType,
        payment_amount: paidAmountCents,
      },
    })
    .where(eq(payments.id, payment.id));

  await db.update(jobs).set({ status: "in_progress" }).where(eq(jobs.id, payment.jobId));

  console.log(
    `[Webhook] Payment ${payment.reference} marked paid. ` +
      `Total ${formatZAR(payment.totalAmountCents)}, fee ${formatZAR(payment.commissionCents)}, ` +
      `payout ${formatZAR(payment.providerPayoutCents)}`,
  );

  return Response.json({ received: true, payment_id: payment.id });
}
