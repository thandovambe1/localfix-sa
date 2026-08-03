import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { jobs, quotes } from "@/db/schema";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Accept or decline a quote. body: { action: "accept" | "decline" } */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const { id } = await params;
  const quoteId = Number(id);
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "decline" ? "decline" : "accept";

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return Response.json({ error: "Quote not found" }, { status: 404 });

  if (action === "decline") {
    await db.update(quotes).set({ status: "declined" }).where(eq(quotes.id, quoteId));
    return Response.json({ ok: true, status: "declined" });
  }

  await db.update(quotes).set({ status: "accepted" }).where(eq(quotes.id, quoteId));
  await db
    .update(quotes)
    .set({ status: "declined" })
    .where(and(eq(quotes.jobId, quote.jobId), ne(quotes.id, quoteId)));
  await db
    .update(jobs)
    .set({ status: "accepted", acceptedQuoteId: quoteId })
    .where(eq(jobs.id, quote.jobId));

  return Response.json({ ok: true, status: "accepted" });
}
