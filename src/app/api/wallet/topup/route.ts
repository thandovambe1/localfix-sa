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
  if (!session) return Response.json({ error: "Please sign in to top up your wallet." }, { status: 401 });

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

  const result = await createWalletTopupCheckout({
    amountCents,
    reference,
    customerId: session.id,
  });

  if (!result.success) return Response.json({ error: result.error }, { status: 502 });

  // Record a pending ledger entry — the webhook completes it.
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

  return Response.json({ ok: true, reference, redirectUrl: result.checkout.redirectUrl });
}
