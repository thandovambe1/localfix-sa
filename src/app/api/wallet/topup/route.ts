import { db } from "@/db";
import { providerWalletTransactions, walletTransactions } from "@/db/schema";
import { getCustomerSession, getProviderSession } from "@/lib/auth";
import { walletOwnerPrefix, walletReference } from "@/lib/wallet";
import { createWalletTopupCheckout } from "@/lib/yoco";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Start a Yoco wallet deposit for the authenticated customer OR provider.
 * The account that receives money is always derived from the server session;
 * a browser-supplied account ID or reference is never trusted.
 */
export async function POST(request: Request) {
  try {
    await ready();

    const [customer, provider] = await Promise.all([getCustomerSession(), getProviderSession()]);
    const owner = provider
      ? { type: "provider" as const, id: provider.id, name: provider.name }
      : customer
        ? { type: "customer" as const, id: customer.id, name: customer.name }
        : null;
    if (!owner) {
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
    const reference = walletReference(walletOwnerPrefix(owner.type));

    const result = await createWalletTopupCheckout({
      amountCents,
      reference,
      ownerType: owner.type,
      ownerId: owner.id,
      displayName: `LocalFix wallet top-up for ${owner.name} (${reference})`,
    });

    if (!result.success) {
      return Response.json({ error: result.error || "Yoco could not create the checkout." }, { status: 502 });
    }

    if (owner.type === "customer") {
      try {
        await db.insert(walletTransactions).values({
          customerId: owner.id,
          type: "topup",
          amountCents,
          balanceAfterCents: 0,
          description: "Wallet deposit via Yoco — awaiting verified confirmation",
          reference,
          status: "pending",
          yocoCheckoutId: result.checkout.id,
        });
      } catch (error) {
        // The webhook reconciles by checkout/reference if this diagnostic row is absent.
        console.error("[Wallet] Pending customer deposit insert failed", error);
      }
    } else {
      try {
        await db.insert(providerWalletTransactions).values({
          providerId: owner.id,
          type: "topup",
          amountCents,
          balanceAfterCents: 0,
          description: "Provider wallet deposit via Yoco — awaiting verified confirmation",
          reference,
          status: "pending",
          yocoCheckoutId: result.checkout.id,
        });
      } catch (error) {
        console.error("[Wallet] Pending provider deposit insert failed", error);
      }
    }

    return Response.json({ ok: true, reference, redirectUrl: result.checkout.redirectUrl });
  } catch (error) {
    console.error("[Wallet] Deposit initiation failed", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Something went wrong starting your deposit." },
      { status: 500 },
    );
  }
}
