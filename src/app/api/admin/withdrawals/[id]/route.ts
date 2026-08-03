import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, inboxMessages, withdrawals } from "@/db/schema";
import { canProcessPayouts, getAdminSession } from "@/lib/auth";
import { formatZAR } from "@/lib/commission";
import { ready } from "@/lib/queries";
import { applyWalletMovement, walletReference } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/withdrawals/:id
 * body: { action: "approve" | "complete" | "reject", reference?, notes? }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!canProcessPayouts(session.role)) {
    return Response.json({ error: "Your role cannot process withdrawals" }, { status: 403 });
  }

  const { id } = await params;
  const withdrawalId = Number(id);
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    reference?: string;
    notes?: string;
  };
  const action = String(body.action ?? "");
  const notes = String(body.notes ?? "");

  const [w] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId)).limit(1);
  if (!w) return Response.json({ error: "Withdrawal not found" }, { status: 404 });
  if (w.status === "completed" || w.status === "rejected") {
    return Response.json({ error: `Withdrawal already ${w.status}` }, { status: 400 });
  }

  const now = new Date();
  let detail = "";

  switch (action) {
    case "approve": {
      await db
        .update(withdrawals)
        .set({
          status: "approved",
          adminNotes: notes,
          processedBy: session.email,
          processedAt: now,
        })
        .where(eq(withdrawals.id, w.id));
      detail = `Approved withdrawal ${w.reference} (${formatZAR(w.amountCents)})`;
      break;
    }

    case "complete": {
      const payoutRef =
        String(body.reference ?? "").trim() ||
        `EFT-${Math.floor(10000 + Math.random() * 89999)}`;

      await db
        .update(withdrawals)
        .set({
          status: "completed",
          adminNotes: notes,
          payoutReference: payoutRef,
          processedBy: session.email,
          processedAt: now,
        })
        .where(eq(withdrawals.id, w.id));

      await db.insert(inboxMessages).values({
        customerId: w.customerId,
        customerEmail: "",
        type: "payout",
        title: `Withdrawal paid out (${w.reference})`,
        body: `${formatZAR(w.amountCents)} has been released to ${w.bankName} · account ending ${w.accountNumber.slice(-4)}. Reference: ${payoutRef}.`,
      });

      detail = `Released ${formatZAR(w.amountCents)} to customer (ref ${payoutRef})`;
      break;
    }

    case "reject": {
      // Refund the wallet.
      await applyWalletMovement({
        customerId: w.customerId,
        amountCents: w.amountCents,
        type: "refund",
        description: `Refund for rejected withdrawal ${w.reference}${notes ? ` — ${notes}` : ""}`,
        reference: walletReference("REF"),
      });

      await db
        .update(withdrawals)
        .set({
          status: "rejected",
          adminNotes: notes,
          processedBy: session.email,
          processedAt: now,
        })
        .where(eq(withdrawals.id, w.id));

      await db.insert(inboxMessages).values({
        customerId: w.customerId,
        customerEmail: "",
        type: "system",
        title: `Withdrawal declined — funds returned (${w.reference})`,
        body: `Your withdrawal of ${formatZAR(w.amountCents)} was declined${
          notes ? `: "${notes}"` : ""
        }. The amount has been returned to your wallet in full.`,
      });

      detail = `Rejected withdrawal ${w.reference} and refunded ${formatZAR(w.amountCents)}`;
      break;
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  await db.insert(auditLogs).values({
    actor: session.email,
    action: `withdrawal.${action}`,
    target: w.reference,
    detail,
  });

  return Response.json({ ok: true });
}
