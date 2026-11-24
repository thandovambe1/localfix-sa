import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  providers,
  providerWalletTransactions,
  providerWithdrawals,
  walletTransactions,
  withdrawals,
} from "@/db/schema";
import { getCustomerSession, getProviderSession } from "@/lib/auth";
import { ready } from "@/lib/queries";
import { walletLedgerSummary } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/** Ownership-safe wallet summary/history for the signed-in account only. */
export async function GET() {
  await ready();

  const [customer, provider] = await Promise.all([getCustomerSession(), getProviderSession()]);
  if (provider) {
    const [row] = await db.select().from(providers).where(eq(providers.id, provider.id)).limit(1);
    if (!row) return Response.json({ error: "Provider account not found." }, { status: 404 });
    const [summary, history, pendingWithdrawalsList] = await Promise.all([
      walletLedgerSummary("provider", provider.id),
      db
        .select()
        .from(providerWalletTransactions)
        .where(eq(providerWalletTransactions.providerId, provider.id))
        .orderBy(desc(providerWalletTransactions.createdAt))
        .limit(50),
      db
        .select()
        .from(providerWithdrawals)
        .where(eq(providerWithdrawals.providerId, provider.id))
        .orderBy(desc(providerWithdrawals.createdAt))
        .limit(20),
    ]);
    const pendingWithdrawals = pendingWithdrawalsList
      .filter((w) => ["requested", "approved", "processing"].includes(w.status))
      .reduce((sum, w) => sum + w.amountCents, 0);
    return Response.json({
      ownerType: "provider",
      balanceCents: row.walletCents,
      summary,
      pendingWithdrawals,
      transactions: history,
      withdrawals: pendingWithdrawalsList,
    });
  }

  if (!customer) return Response.json({ error: "Please sign in." }, { status: 401 });
  const [row] = await db.select().from(customers).where(eq(customers.id, customer.id)).limit(1);
  if (!row) return Response.json({ error: "Customer account not found." }, { status: 404 });

  const [summary, history, pendingWithdrawalsList] = await Promise.all([
    walletLedgerSummary("customer", customer.id),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.customerId, customer.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50),
    db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.customerId, customer.id))
      .orderBy(desc(withdrawals.createdAt))
      .limit(20),
  ]);
  const pendingWithdrawals = pendingWithdrawalsList
    .filter((w) => ["requested", "approved", "processing"].includes(w.status))
    .reduce((sum, w) => sum + w.amountCents, 0);

  return Response.json({
    ownerType: "customer",
    balanceCents: row.walletCents,
    summary,
    pendingWithdrawals,
    transactions: history,
    withdrawals: pendingWithdrawalsList,
  });
}
