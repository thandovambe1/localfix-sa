import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  inboxMessages,
  jobs,
  payments,
  providers,
  providerWalletTransactions,
  walletTransactions,
  webhookEvents,
} from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/yoco";
import { applyCustomerWalletMovement, applyProviderWalletMovement } from "@/lib/wallet";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

type YocoEvent = {
  id?: string;
  type?: string;
  payload?: {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, unknown> & { checkoutId?: string };
  };
};

function metadata(event: YocoEvent) {
  return event.payload?.metadata ?? {};
}

async function rememberEvent(
  event: YocoEvent,
  checkoutId: string | null,
  status = "processed",
): Promise<{ duplicate: boolean }> {
  const eventId = String(event.id ?? "").trim();
  if (!eventId) {
    console.warn("[Webhook] Event has no id; processing without event deduplication");
    return { duplicate: false };
  }
  try {
    const inserted = await db
      .insert(webhookEvents)
      .values({
        provider: "yoco",
        eventId,
        eventType: String(event.type ?? "unknown"),
        checkoutId,
        paymentId: event.payload?.id ?? null,
        status,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    return { duplicate: inserted.length === 0 };
  } catch (error) {
    console.error("[Webhook] Event ledger insert failed", error);
    return { duplicate: false };
  }
}

async function completeWalletDeposit(event: YocoEvent, checkoutId: string) {
  const meta = metadata(event);
  const ownerType = String(meta.owner_type ?? (meta.kind === "wallet_topup" ? "customer" : ""));
  const ownerId = Number(meta.owner_id ?? meta.customer_id ?? 0);
  const reference = String(meta.localfix_reference ?? "");
  const expectedAmount = Number(event.payload?.amount ?? 0);

  if (!["customer", "provider"].includes(ownerType) || !ownerId || !reference || !expectedAmount) {
    console.error("[Webhook] Wallet deposit metadata is incomplete", { checkoutId, ownerType, ownerId, reference, expectedAmount });
    return Response.json({ error: "Wallet deposit metadata incomplete" }, { status: 400 });
  }
  if (event.payload?.currency && event.payload.currency !== "ZAR") {
    console.error("[Webhook] Wallet deposit currency rejected", { checkoutId, currency: event.payload.currency });
    return Response.json({ error: "Unsupported payment currency" }, { status: 400 });
  }

  if (ownerType === "customer") {
    const [pending] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.yocoCheckoutId, checkoutId))
      .limit(1);
    if (pending?.status === "completed") return Response.json({ received: true, already_processed: true });
    if (pending && (pending.customerId !== ownerId || pending.amountCents !== expectedAmount || pending.reference !== reference)) {
      console.error("[Webhook] Customer deposit validation failed", { checkoutId, reference });
      return Response.json({ error: "Deposit validation failed" }, { status: 400 });
    }

    const result = pending
      ? await db.transaction(async (tx) => {
          const [customer] = await tx
            .select()
            .from(customers)
            .where(eq(customers.id, ownerId))
            .for("update")
            .limit(1);
          if (!customer) throw new Error("Customer account not found");
          const [claimed] = await tx
            .update(walletTransactions)
            .set({ status: "completed" })
            .where(and(eq(walletTransactions.id, pending.id), eq(walletTransactions.status, "pending")))
            .returning({ id: walletTransactions.id });
          if (!claimed) return { balanceCents: customer.walletCents, alreadyProcessed: true };
          const balanceCents = customer.walletCents + expectedAmount;
          await tx
            .update(customers)
            .set({ walletCents: balanceCents })
            .where(eq(customers.id, ownerId));
          await tx
            .update(walletTransactions)
            .set({ balanceAfterCents: balanceCents })
            .where(eq(walletTransactions.id, pending.id));
          return { balanceCents, alreadyProcessed: false };
        })
      : await applyCustomerWalletMovement({
          customerId: ownerId,
          amountCents: expectedAmount,
          type: "topup",
          description: "Wallet deposit confirmed by Yoco",
          reference,
          yocoCheckoutId: checkoutId,
        });

    return Response.json({
      received: true,
      wallet_topup: true,
      balanceCents: result.balanceCents,
      already_processed: "alreadyProcessed" in result ? result.alreadyProcessed : false,
    });
  }

  const [pending] = await db
    .select()
    .from(providerWalletTransactions)
    .where(eq(providerWalletTransactions.yocoCheckoutId, checkoutId))
    .limit(1);
  if (pending?.status === "completed") return Response.json({ received: true, already_processed: true });
  if (pending && (pending.providerId !== ownerId || pending.amountCents !== expectedAmount || pending.reference !== reference)) {
    console.error("[Webhook] Provider deposit validation failed", { checkoutId, reference });
    return Response.json({ error: "Deposit validation failed" }, { status: 400 });
  }

  const result = pending
    ? await db.transaction(async (tx) => {
        const [provider] = await tx
          .select()
          .from(providers)
          .where(eq(providers.id, ownerId))
          .for("update")
          .limit(1);
        if (!provider) throw new Error("Provider account not found");
        const [claimed] = await tx
          .update(providerWalletTransactions)
          .set({ status: "completed", yocoPaymentId: event.payload?.id ?? null })
          .where(and(eq(providerWalletTransactions.id, pending.id), eq(providerWalletTransactions.status, "pending")))
          .returning({ id: providerWalletTransactions.id });
        if (!claimed) return { balanceCents: provider.walletCents, alreadyProcessed: true };
        const balanceCents = provider.walletCents + expectedAmount;
        await tx
          .update(providers)
          .set({ walletCents: balanceCents })
          .where(eq(providers.id, ownerId));
        await tx
          .update(providerWalletTransactions)
          .set({ balanceAfterCents: balanceCents })
          .where(eq(providerWalletTransactions.id, pending.id));
        return { balanceCents, alreadyProcessed: false };
      })
    : await applyProviderWalletMovement({
        providerId: ownerId,
        amountCents: expectedAmount,
        type: "topup",
        description: "Provider wallet deposit confirmed by Yoco",
        reference,
        yocoCheckoutId: checkoutId,
        yocoPaymentId: event.payload?.id ?? null,
      });

  return Response.json({
    received: true,
    wallet_topup: true,
    balanceCents: result.balanceCents,
    already_processed: "alreadyProcessed" in result ? result.alreadyProcessed : false,
    ownerType,
  });
}

async function failOrCancelWalletDeposit(event: YocoEvent, checkoutId: string) {
  const meta = metadata(event);
  const ownerType = String(meta.owner_type ?? "");
  if (ownerType === "provider") {
    await db
      .update(providerWalletTransactions)
      .set({ status: event.type?.includes("expired") ? "cancelled" : "failed" })
      .where(and(eq(providerWalletTransactions.yocoCheckoutId, checkoutId), eq(providerWalletTransactions.status, "pending")));
  } else {
    await db
      .update(walletTransactions)
      .set({ status: event.type?.includes("expired") ? "cancelled" : "failed" })
      .where(and(eq(walletTransactions.yocoCheckoutId, checkoutId), eq(walletTransactions.status, "pending")));
  }
}

export async function POST(request: Request) {
  await ready();
  const rawBody = await request.text();

  if (
    !verifyWebhookSignature(rawBody, {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    })
  ) {
    console.error("[Webhook] Invalid Yoco signature rejected");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: YocoEvent;
  try {
    event = JSON.parse(rawBody) as YocoEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checkoutId = String(event.payload?.metadata?.checkoutId ?? "").trim();

  try {
    const remembered = await rememberEvent(event, checkoutId || null);
    if (remembered.duplicate) {
      return Response.json({ received: true, already_processed: true, duplicate_event: true });
    }

    if (event.type === "payment.failed" || event.type === "payment.cancelled" || event.type === "payment.expired") {
      if (checkoutId) await failOrCancelWalletDeposit(event, checkoutId);
      return Response.json({ received: true, payment_not_credited: true });
    }

    if (event.type !== "payment.succeeded") return Response.json({ received: true, ignored: true });
    if (!checkoutId) return Response.json({ error: "Missing checkoutId" }, { status: 400 });

    const metaKind = String(metadata(event).kind ?? "");
    const metaOwner = String(metadata(event).owner_type ?? "");
    if (metaKind === "wallet_topup" || metaOwner) {
      return completeWalletDeposit(event, checkoutId);
    }

    // Existing LocalFix job-payment flow.
    const [payment] = await db.select().from(payments).where(eq(payments.yocoCheckoutId, checkoutId)).limit(1);
    if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "paid" || payment.status === "paid_out") {
      return Response.json({ received: true, already_processed: true });
    }
    if (event.payload?.currency && event.payload.currency !== "ZAR") {
      return Response.json({ error: "Unsupported payment currency" }, { status: 400 });
    }
    if (event.payload?.amount && event.payload.amount !== payment.totalAmountCents) {
      console.error("[Webhook] Job payment amount mismatch", { checkoutId, expected: payment.totalAmountCents, received: event.payload.amount });
      return Response.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    await db
      .update(payments)
      .set({
        status: "paid",
        yocoPaymentId: event.payload?.id ?? null,
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
    await db.insert(inboxMessages).values({
      customerId: null,
      customerEmail: "",
      type: "payment",
      title: `Payment confirmed (${payment.reference})`,
      body: "Your payment was confirmed and the provider can now begin work.",
      jobId: payment.jobId,
    }).catch(() => undefined);

    return Response.json({ received: true, payment_id: payment.id });
  } catch (error) {
    console.error("[Webhook] Processing failed", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
