import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, providerWithdrawals } from "@/db/schema";
import { canProcessPayouts, getAdminSession } from "@/lib/auth";
import { formatZAR } from "@/lib/commission";
import { ready } from "@/lib/queries";
import { applyProviderWalletMovement, walletReference } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!canProcessPayouts(session.role)) {
    return Response.json({ error: "Your role cannot process provider withdrawals" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; reference?: string; notes?: string };
  const action = String(body.action ?? "");
  const notes = String(body.notes ?? "");

  const [withdrawal] = await db
    .select()
    .from(providerWithdrawals)
    .where(eq(providerWithdrawals.id, Number(id)))
    .limit(1);
  if (!withdrawal) return Response.json({ error: "Withdrawal not found" }, { status: 404 });
  if (withdrawal.status === "completed" || withdrawal.status === "rejected") {
    return Response.json({ error: `Withdrawal already ${withdrawal.status}` }, { status: 409 });
  }

  let detail = "";
  if (action === "approve") {
    // Approval records intent only; it never claims the EFT has been paid.
    await db
      .update(providerWithdrawals)
      .set({ status: "approved", adminNotes: notes, processedBy: session.email, processedAt: new Date() })
      .where(eq(providerWithdrawals.id, withdrawal.id));
    detail = `Approved provider withdrawal ${withdrawal.reference} (${formatZAR(withdrawal.amountCents)})`;
  } else if (action === "complete") {
    const payoutReference = String(body.reference ?? "").trim() || `EFT-${Math.floor(10000 + Math.random() * 89999)}`;
    await db
      .update(providerWithdrawals)
      .set({
        status: "completed",
        adminNotes: notes,
        payoutReference,
        processedBy: session.email,
        processedAt: new Date(),
      })
      .where(eq(providerWithdrawals.id, withdrawal.id));
    detail = `Released ${formatZAR(withdrawal.amountCents)} to provider (ref ${payoutReference})`;
  } else if (action === "reject") {
    await applyProviderWalletMovement({
      providerId: withdrawal.providerId,
      amountCents: withdrawal.amountCents,
      type: "refund",
      description: `Refund for rejected provider withdrawal ${withdrawal.reference}${notes ? ` — ${notes}` : ""}`,
      reference: walletReference("REF"),
    });
    await db
      .update(providerWithdrawals)
      .set({ status: "rejected", adminNotes: notes, processedBy: session.email, processedAt: new Date() })
      .where(eq(providerWithdrawals.id, withdrawal.id));
    detail = `Rejected provider withdrawal ${withdrawal.reference} and refunded ${formatZAR(withdrawal.amountCents)}`;
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  await db.insert(auditLogs).values({
    actor: session.email,
    action: `provider_withdrawal.${action}`,
    target: withdrawal.reference,
    detail,
  });

  return Response.json({ ok: true });
}
