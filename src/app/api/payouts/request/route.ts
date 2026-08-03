import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/payouts/request
 * A service provider requests release of their 87% payout for a cleared payment.
 * body: { paymentId: number }
 */
export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as { paymentId?: number };
  const paymentId = Number(body.paymentId);
  if (!paymentId) return Response.json({ error: "paymentId is required" }, { status: 400 });

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.status, "paid")))
    .limit(1);

  if (!payment) {
    return Response.json({ error: "No cleared payment found for this ID" }, { status: 404 });
  }
  if (payment.payoutStatus === "completed") {
    return Response.json({ error: "This payout has already been released" }, { status: 400 });
  }

  const [updated] = await db
    .update(payments)
    .set({ payoutStatus: "requested", payoutRequestedAt: new Date() })
    .where(eq(payments.id, paymentId))
    .returning();

  return Response.json({ ok: true, payment: updated });
}
