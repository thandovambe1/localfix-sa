import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, walletTransactions } from "@/db/schema";

export function walletReference(prefix = "WLT"): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`;
}

/**
 * Atomically credit or debit a customer wallet and write a ledger entry.
 * `amountCents` is signed: positive credits, negative debits.
 * Throws when a debit would overdraw the wallet.
 */
export async function applyWalletMovement(opts: {
  customerId: number;
  amountCents: number;
  type: "topup" | "payment" | "refund" | "bonus" | "withdrawal";
  description: string;
  reference?: string;
  jobId?: number | null;
  yocoCheckoutId?: string | null;
}) {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, opts.customerId))
      .for("update")
      .limit(1);

    if (!customer) throw new Error("Customer not found");

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
        status: "completed",
        jobId: opts.jobId ?? null,
        yocoCheckoutId: opts.yocoCheckoutId ?? null,
      })
      .returning();

    return { balanceCents: nextBalance, transaction: entry };
  });
}
