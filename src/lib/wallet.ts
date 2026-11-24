import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, providers, providerWalletTransactions, walletTransactions } from "@/db/schema";

export function walletReference(prefix = "WLT"): string {
  const entropy = createHmac("sha256", `${Date.now()}-${Math.random()}`)
    .update(`${process.pid}-${Math.random()}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return `${prefix}-${entropy}`;
}

export type WalletOwnerType = "customer" | "provider";

export function walletOwnerPrefix(ownerType: WalletOwnerType) {
  return ownerType === "provider" ? "PWT" : "WLT";
}

/** Atomically credit/debit a customer account and write its permanent ledger row. */
export async function applyCustomerWalletMovement(opts: {
  customerId: number;
  amountCents: number;
  type: "topup" | "payment" | "refund" | "bonus" | "withdrawal";
  description: string;
  reference?: string;
  jobId?: number | null;
  yocoCheckoutId?: string | null;
  status?: "pending" | "completed" | "failed" | "cancelled";
}) {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, opts.customerId))
      .for("update")
      .limit(1);

    if (!customer) throw new Error("Customer account not found");

    const nextBalance = customer.walletCents + opts.amountCents;
    if (nextBalance < 0) throw new Error("Insufficient wallet balance");

    await tx.update(customers).set({ walletCents: nextBalance }).where(eq(customers.id, customer.id));

    const [entry] = await tx
      .insert(walletTransactions)
      .values({
        customerId: customer.id,
        type: opts.type,
        amountCents: opts.amountCents,
        balanceAfterCents: nextBalance,
        description: opts.description,
        reference: opts.reference ?? walletReference(),
        status: opts.status ?? "completed",
        jobId: opts.jobId ?? null,
        yocoCheckoutId: opts.yocoCheckoutId ?? null,
      })
      .returning();

    return { balanceCents: nextBalance, transaction: entry };
  });
}

/** Backward-compatible name used by existing customer job-payment code. */
export async function applyWalletMovement(opts: Parameters<typeof applyCustomerWalletMovement>[0]) {
  return applyCustomerWalletMovement(opts);
}

/** Atomically credit/debit a provider account and write its provider ledger row. */
export async function applyProviderWalletMovement(opts: {
  providerId: number;
  amountCents: number;
  type: "topup" | "payment_credit" | "refund" | "bonus" | "withdrawal";
  description: string;
  reference?: string;
  jobId?: number | null;
  yocoCheckoutId?: string | null;
  yocoPaymentId?: string | null;
  status?: "pending" | "completed" | "failed" | "cancelled";
}) {
  return db.transaction(async (tx) => {
    const [provider] = await tx
      .select()
      .from(providers)
      .where(eq(providers.id, opts.providerId))
      .for("update")
      .limit(1);

    if (!provider) throw new Error("Provider account not found");

    const nextBalance = provider.walletCents + opts.amountCents;
    if (nextBalance < 0) throw new Error("Insufficient wallet balance");

    await tx.update(providers).set({ walletCents: nextBalance }).where(eq(providers.id, provider.id));

    const [entry] = await tx
      .insert(providerWalletTransactions)
      .values({
        providerId: provider.id,
        type: opts.type,
        amountCents: opts.amountCents,
        balanceAfterCents: nextBalance,
        description: opts.description,
        reference: opts.reference ?? walletReference("PWT"),
        status: opts.status ?? "completed",
        jobId: opts.jobId ?? null,
        yocoCheckoutId: opts.yocoCheckoutId ?? null,
        yocoPaymentId: opts.yocoPaymentId ?? null,
      })
      .returning();

    return { balanceCents: nextBalance, transaction: entry };
  });
}

/** Non-mutating reconciliation helpers used by user and admin dashboards. */
export async function walletLedgerSummary(ownerType: WalletOwnerType, ownerId: number) {
  if (ownerType === "customer") {
    const [row] = await db
      .select({
        deposits: sql<number>`coalesce(sum(amount_cents) filter (where type = 'topup' and status = 'completed'), 0)::int`,
        withdrawals: sql<number>`coalesce(abs(sum(amount_cents) filter (where type = 'withdrawal' and status = 'completed')), 0)::int`,
        spent: sql<number>`coalesce(abs(sum(amount_cents) filter (where type = 'payment' and status = 'completed')), 0)::int`,
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.customerId, ownerId));
    return row;
  }

  const [row] = await db
    .select({
      deposits: sql<number>`coalesce(sum(amount_cents) filter (where type = 'topup' and status = 'completed'), 0)::int`,
      withdrawals: sql<number>`coalesce(abs(sum(amount_cents) filter (where type = 'withdrawal' and status = 'completed')), 0)::int`,
      earned: sql<number>`coalesce(sum(amount_cents) filter (where type = 'payment_credit' and status = 'completed'), 0)::int`,
    })
    .from(providerWalletTransactions)
    .where(eq(providerWalletTransactions.providerId, ownerId));
  return row;
}
