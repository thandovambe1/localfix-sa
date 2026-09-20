import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { walletTransactions } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { walletReference } from "@/lib/wallet";
import { createWalletTopupCheckout } from "@/lib/yoco";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, usage: "POST { amount: number (rands, min 50) } to start a Yoco wallet top-up." });
}

/**
 * POST /api/wallet/topup — start a Yoco checkout that credits the wallet.
 * body: { amount: number }  (whole rands)
 *
 * This handler ALWAYS responds with JSON — including on unexpected errors —
 * so the client can never crash parsing an empty response body.
 */
export async function POST(request: Request) {
  const requestId = randomUUID().slice(0, 8);
  try {
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
    const reference = walletReference();

    console.log(`[wallet-topup ${requestId}] customer=${session.id} amount=${amountCents} ref=${reference}`);

    const result = await createWalletTopupCheckout({ amountCents, reference, customerId: session.id });

    if (!result.success) {
      console.error(`[wallet-topup ${requestId}] Yoco failed: ${result.error}`);
      return Response.json({ error: result.error, requestId }, { status: 502 });
    }

    if (!result.checkout?.redirectUrl) {
      console.error(`[wallet-topup ${requestId}] Yoco checkout missing redirectUrl`);
      return Response.json(
        { error: "Payment provider returned an incomplete checkout. Please try again.", requestId },
        { status: 502 },
      );
    }

    // Record a pending ledger entry — the webhook (or status check) completes it.
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

    console.log(`[wallet-topup ${requestId}] checkout ${result.checkout.id} created`);
    return Response.json({ ok: true, reference, redirectUrl: result.checkout.redirectUrl });
  } catch (err) {
    console.error(`[wallet-topup ${requestId}] unexpected error:`, err);
    return Response.json(
      {
        error: "Something went wrong starting your top-up. Please try again.",
        requestId,
      },
      { status: 500 },
    );
  }
}
