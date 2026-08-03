import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, jobs, payments } from "@/db/schema";
import { canProcessPayouts, getAdminSession } from "@/lib/auth";
import { formatZAR } from "@/lib/commission";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/payments/:id
 *
 * Admin payout actions.
 * body: { action: "approve" | "process" | "complete" | "hold" | "refund", reference?, notes? }
 *
 * The platform receives the full customer payment, retains the 13% commission
 * and releases the remaining 87% to the service provider.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!canProcessPayouts(session.role)) {
    return Response.json({ error: "Your role cannot process payouts" }, { status: 403 });
  }

  const { id } = await params;
  const paymentId = Number(id);
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    reference?: string;
    notes?: string;
  };

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });

  const action = String(body.action ?? "");
  const notes = String(body.notes ?? payment.payoutNotes ?? "");

  let patch: Partial<typeof payments.$inferInsert> = {};
  let detail = "";

  switch (action) {
    case "approve":
      if (payment.status !== "paid") {
        return Response.json({ error: "Customer payment has not cleared yet" }, { status: 400 });
      }
      patch = { payoutStatus: "processing", payoutNotes: notes, processedBy: session.email };
      detail = `Approved payout of ${formatZAR(payment.providerPayoutCents)}`;
      break;

    case "complete": {
      if (payment.status !== "paid") {
        return Response.json({ error: "Customer payment has not cleared yet" }, { status: 400 });
      }
      const ref = String(body.reference ?? "").trim() || `EFT-${Math.floor(10000 + Math.random() * 89999)}`;
      patch = {
        payoutStatus: "completed",
        status: "paid_out",
        payoutReference: ref,
        payoutAt: new Date(),
        payoutNotes: notes,
        processedBy: session.email,
      };
      detail = `Released ${formatZAR(payment.providerPayoutCents)} to provider (ref ${ref}). Platform retained ${formatZAR(payment.commissionCents)}.`;
      // Job is fully settled once the provider has been paid.
      await db.update(jobs).set({ status: "completed" }).where(eq(jobs.id, payment.jobId));
      break;
    }

    case "hold":
      patch = { payoutStatus: "payout_pending", payoutNotes: notes, processedBy: session.email };
      detail = "Payout placed on hold";
      break;

    case "refund":
      patch = { status: "refunded", payoutStatus: "pending", payoutNotes: notes, processedBy: session.email };
      detail = `Refunded ${formatZAR(payment.totalAmountCents)} to the customer`;
      break;

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const [updated] = await db.update(payments).set(patch).where(eq(payments.id, paymentId)).returning();

  await db.insert(auditLogs).values({
    actor: session.email,
    action: `payment.${action}`,
    target: payment.reference,
    detail,
  });

  return Response.json({ ok: true, payment: updated });
}
