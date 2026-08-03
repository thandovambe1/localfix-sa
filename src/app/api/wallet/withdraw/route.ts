import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, inboxMessages, withdrawals } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { formatZAR } from "@/lib/commission";
import { ready } from "@/lib/queries";
import { applyWalletMovement, walletReference } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/** GET — list the signed-in customer's withdrawal history. */
export async function GET() {
  await ready();
  const session = await getCustomerSession();
  if (!session) return Response.json({ withdrawals: [] });

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.customerId, session.id))
    .orderBy(desc(withdrawals.createdAt))
    .limit(20);

  return Response.json({ withdrawals: rows });
}

/**
 * POST — request a withdrawal.
 * Debits the wallet immediately (funds move into "requested" state).
 * Admins release the payout from /admin/withdrawals.
 *
 * body: { amount, bankName, accountHolder, accountNumber, branchCode?, accountType? }
 */
export async function POST(request: Request) {
  await ready();

  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Please sign in first." }, { status: 401 });

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

  // Guard against duplicate pending requests
  const pending = await db
    .select({ id: withdrawals.id })
    .from(withdrawals)
    .where(
      and(
        eq(withdrawals.customerId, session.id),
        inArray(withdrawals.status, ["requested", "approved", "processing"]),
      ),
    );
  if (pending.length >= 3) {
    return Response.json(
      { error: "You already have 3 pending withdrawals. Please wait for one to be processed." },
      { status: 400 },
    );
  }

  const amountCents = Math.round(amount * 100);
  const reference = walletReference("WDR");

  // Debit the wallet immediately (throws if insufficient balance).
  let balanceCents = 0;
  try {
    const movement = await applyWalletMovement({
      customerId: session.id,
      amountCents: -amountCents,
      type: "withdrawal",
      description: `Withdrawal request to ${bankName} · ${accountNumber.slice(-4).padStart(accountNumber.length, "•")}`,
      reference,
    });
    balanceCents = movement.balanceCents;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Wallet debit failed" },
      { status: 400 },
    );
  }

  const [withdrawal] = await db
    .insert(withdrawals)
    .values({
      customerId: session.id,
      amountCents,
      reference,
      bankName,
      accountHolder,
      accountNumber,
      branchCode: String(body.branchCode ?? ""),
      accountType: String(body.accountType ?? "cheque"),
    })
    .returning();

  // Drop a receipt in the customer's inbox.
  await db.insert(inboxMessages).values({
    customerId: session.id,
    customerEmail: session.email,
    type: "system",
    title: `Withdrawal request received (${reference})`,
    body: `We received your withdrawal request for ${formatZAR(amountCents)} to ${bankName}. Funds are held in your account until an admin releases the EFT — usually within 1–2 business days. You'll receive another message when it's paid out.`,
  });

  return Response.json({ ok: true, withdrawal, balanceCents }, { status: 201 });
}
