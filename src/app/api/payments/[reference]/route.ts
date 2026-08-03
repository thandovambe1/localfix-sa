import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/:reference
 * Returns the payment status and full breakdown.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  await ready();
  const { reference } = await params;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.reference, reference))
    .limit(1);

  if (!payment) {
    return Response.json({ error: "Payment not found" }, { status: 404 });
  }

  return Response.json({
    payment: {
      id: payment.id,
      reference: payment.reference,
      status: payment.status,
      totalAmountCents: payment.totalAmountCents,
      commissionCents: payment.commissionCents,
      providerPayoutCents: payment.providerPayoutCents,
      commissionRate: payment.commissionRate,
      payoutStatus: payment.payoutStatus,
      payoutReference: payment.payoutReference,
      paidAt: payment.paidAt,
      payoutAt: payment.payoutAt,
      createdAt: payment.createdAt,
    },
  });
}
