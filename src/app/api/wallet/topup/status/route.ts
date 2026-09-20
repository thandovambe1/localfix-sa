import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, walletTransactions } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/wallet/topup/status?reference=WLT-123456
 *
 * Lets a signed-in customer check whether their own top-up has been
 * credited yet. Yoco confirms payment via webhook, which can lag the
 * redirect by a few seconds — the dashboard polls this endpoint after
 * returning from Yoco so the balance update feels instant.
 */
export async function GET(request: Request) {
  try {
    await ready();

    const session = await getCustomerSession();
    if (!session) return Response.json({ error: "Please sign in." }, { status: 401 });

    const reference = new URL(request.url).searchParams.get("reference")?.trim() ?? "";
    if (!reference) return Response.json({ error: "reference is required." }, { status: 400 });

    const [entry] = await db
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.reference, reference), eq(walletTransactions.customerId, session.id)))
      .limit(1);

    if (!entry) return Response.json({ error: "Top-up not found." }, { status: 404 });

    const [customer] = await db
      .select({ walletCents: customers.walletCents })
      .from(customers)
      .where(eq(customers.id, session.id))
      .limit(1);

    return Response.json({
      reference: entry.reference,
      status: entry.status,
      amountCents: entry.amountCents,
      balanceCents: customer?.walletCents ?? 0,
      credited: entry.status === "completed",
    });
  } catch (err) {
    console.error("[wallet-topup-status] unexpected error:", err);
    return Response.json({ error: "Could not check top-up status. Please try again." }, { status: 500 });
  }
}
