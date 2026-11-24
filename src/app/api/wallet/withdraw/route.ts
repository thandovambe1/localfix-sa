import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  inboxMessages,
  providers,
  providerWalletTransactions,
  providerWithdrawals,
  walletTransactions,
  withdrawals,
} from "@/db/schema";
import { getCustomerSession, getProviderSession } from "@/lib/auth";
import { formatZAR } from "@/lib/commission";
import { ready } from "@/lib/queries";
import { walletReference } from "@/lib/wallet";

export const dynamic = "force-dynamic";

async function ownerSession() {
  const [customer, provider] = await Promise.all([getCustomerSession(), getProviderSession()]);
  if (provider) return { type: "provider" as const, id: provider.id, email: provider.email };
  if (customer) return { type: "customer" as const, id: customer.id, email: customer.email };
  return null;
}

export async function GET() {
  await ready();
  const owner = await ownerSession();
  if (!owner) return Response.json({ withdrawals: [] });

  const rows =
    owner.type === "provider"
      ? await db
          .select()
          .from(providerWithdrawals)
          .where(eq(providerWithdrawals.providerId, owner.id))
          .orderBy(desc(providerWithdrawals.createdAt))
          .limit(20)
      : await db
          .select()
          .from(withdrawals)
          .where(eq(withdrawals.customerId, owner.id))
          .orderBy(desc(withdrawals.createdAt))
          .limit(20);

  return Response.json({ withdrawals: rows });
}

export async function POST(request: Request) {
  try {
    await ready();
    const owner = await ownerSession();
    if (!owner) return Response.json({ error: "Please sign in first." }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const amount = Number(body.amount);
    const bankName = String(body.bankName ?? "").trim();
    const accountHolder = String(body.accountHolder ?? "").trim();
    const accountNumber = String(body.accountNumber ?? "").replace(/\s+/g, "");

    if (!Number.isFinite(amount) || amount < 50) {
      return Response.json({ error: "Minimum withdrawal is R50." }, { status: 400 });
    }
    if (amount > 100000) {
      return Response.json({ error: "Maximum single withdrawal is R100 000." }, { status: 400 });
    }
    if (!bankName || !accountHolder || !/^\d{6,12}$/.test(accountNumber)) {
      return Response.json(
        { error: "Please provide the bank, account holder and a valid account number (digits only)." },
        { status: 400 },
      );
    }

    const amountCents = Math.round(amount * 100);
    const reference = walletReference(owner.type === "provider" ? "PWD" : "WDR");

    // One DB transaction: check duplicate/pending pressure, debit/reserve and
    // create the request. A failed insert cannot leave an orphan debit.
    const withdrawal = await db.transaction(async (tx) => {
      if (owner.type === "customer") {
        const pending = await tx
          .select({ id: withdrawals.id })
          .from(withdrawals)
          .where(and(eq(withdrawals.customerId, owner.id), inArray(withdrawals.status, ["requested", "approved", "processing"])));
        if (pending.length >= 3) throw new Error("You already have 3 pending withdrawals.");

        const [account] = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, owner.id))
          .for("update")
          .limit(1);
        if (!account) throw new Error("Customer account not found");
        if (account.walletCents < amountCents) throw new Error("Insufficient wallet balance");

        const nextBalance = account.walletCents - amountCents;
        await tx.update(customers).set({ walletCents: nextBalance }).where(eq(customers.id, owner.id));
        const [created] = await tx
          .insert(withdrawals)
          .values({
            customerId: owner.id,
            amountCents,
            reference,
            bankName,
            accountHolder,
            accountNumber,
            branchCode: String(body.branchCode ?? ""),
            accountType: String(body.accountType ?? "cheque"),
          })
          .returning();
        await tx.insert(walletTransactions).values({
          customerId: owner.id,
          type: "withdrawal",
          amountCents: -amountCents,
          balanceAfterCents: nextBalance,
          description: `Withdrawal request to ${bankName} · ••••${accountNumber.slice(-4)}`,
          reference,
          status: "completed",
        });
        return created;
      }

      const pending = await tx
        .select({ id: providerWithdrawals.id })
        .from(providerWithdrawals)
        .where(and(eq(providerWithdrawals.providerId, owner.id), inArray(providerWithdrawals.status, ["requested", "approved", "processing"])));
      if (pending.length >= 3) throw new Error("You already have 3 pending withdrawals.");

      const [account] = await tx
        .select()
        .from(providers)
        .where(eq(providers.id, owner.id))
        .for("update")
        .limit(1);
      if (!account) throw new Error("Provider account not found");
      if (account.walletCents < amountCents) throw new Error("Insufficient wallet balance");

      const nextBalance = account.walletCents - amountCents;
      await tx
        .update(providers)
        .set({ walletCents: nextBalance })
        .where(eq(providers.id, owner.id));
      const [created] = await tx
        .insert(providerWithdrawals)
        .values({
          providerId: owner.id,
          amountCents,
          reference,
          bankName,
          accountHolder,
          accountNumber,
          branchCode: String(body.branchCode ?? ""),
          accountType: String(body.accountType ?? "cheque"),
        })
        .returning();
      await tx.insert(providerWalletTransactions).values({
        providerId: owner.id,
        type: "withdrawal",
        amountCents: -amountCents,
        balanceAfterCents: nextBalance,
        description: `Provider withdrawal request to ${bankName} · ••••${accountNumber.slice(-4)}`,
        reference,
        status: "completed",
      });
      return created;
    });

    if (owner.type === "customer") {
      await db.insert(inboxMessages).values({
        customerId: owner.id,
        customerEmail: owner.email,
        type: "system",
        title: `Withdrawal request received (${reference})`,
        body: `We received your withdrawal request for ${formatZAR(amountCents)} to ${bankName}. Funds are reserved until an admin releases the EFT.`,
      });
    }

    return Response.json({ ok: true, withdrawal }, { status: 201 });
  } catch (error) {
    console.error("[Wallet] Withdrawal request failed", error);
    const message = error instanceof Error ? error.message : "Withdrawal request failed";
    const status = message.includes("Insufficient") || message.includes("already have") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
