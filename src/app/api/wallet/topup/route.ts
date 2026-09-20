import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { walletTransactions } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { walletReference } from "@/lib/wallet";
import { createWalletTopupCheckout } from "@/lib/yoco";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/topup — start a Yoco checkout that credits the wallet.
 * body: { amount: number }  (whole rands)
 */
export async function POST(request: Request) {
  await ready();

  const session = await getCustomerSession();
  if (!session) {
    return Response.json({ error: "Please sign in to top up your wallet." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { amount?: number };
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount < 50) {
    return Response.json({ error: "Minimum top-up is R50." }, { status: 400 });
  }
  if (amount > 100000) {
    return Response.json({ error: "Maximum single top-up is R100 000." }, { status: 400 });
  }

  const amountCents = Math.round(amount * 100);

  // Idempotency for double-clicks: reuse a recent pending top-up for the
  // exact same amount instead of creating a second checkout/ledger row.
  const recentPending = await db
    .select()
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.customerId, session.id),
        eq(walletTransactions.type, "topup"),
        eq(walletTransactions.status, "pending"),
        eq(walletTransactions.amountCents, amountCents),
      ),
    )
    .orderBy(desc(walletTransactions.createdAt))
    .limit(1);

  if (recentPending[0]?.yocoCheckoutId) {
    // Return the existing Yoco redirect URL for the open top-up.
    const result = await createWalletTopupCheckout({
      amountCents,
      reference: recentPending[0].reference,
      customerId: session.id,
    });
    if (result.success) {
      return Response.json({
        ok: true,
        reference: recentPending[0].reference,
        redirectUrl: result.checkout.redirectUrl,
      });
    }
    // If the gateway no longer accepts that reference, fall through and
    // create a fresh checkout below.
  }

  const reference = walletReference();

  const result = await createWalletTopupCheckout({
    amountCents,
    reference,
    customerId: session.id,
  });

  if (!result.success) {
    // Record the failed attempt for support/audit, but never as a balance change.
    await db
      .insert(walletTransactions)
      .values({
        customerId: session.id,
        type: "topup",
        amountCents,
        balanceAfterCents: 0,
        description: "Failed wallet top-up attempt via Yoco",
        reference,
        status: "failed",
        failureReason: result.error,
      })
      .catch(() => null);

    return Response.json({ error: result.error }, { status: 502 });
  }

  // Persist a pending ledger entry. The webhook replaces it with a completed
  // credit. It never affects the wallet balance while pending.
  await db.insert(walletTransactions).values({
    customerId: session.id,
    type: "topup",
    amountCents,
    balanceAfterCents: 0,
    description: "Wallet top-up via Yoco",
    reference,
    status: "pending",
    yocoCheckoutId: result.checkout.id,
  });

  return Response.json({
    ok: true,
    reference,
    amountCents,
    redirectUrl: result.checkout.redirectUrl,
  });
}
