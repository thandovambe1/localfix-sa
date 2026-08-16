import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { jobs, quotes } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Customer-only quote decision endpoint.
 *
 * Service providers may submit quotes, but they may NEVER accept, confirm,
 * book, award, or select themselves for a customer's job. A quote decision
 * is valid only when made by the authenticated customer who owns the job.
 *
 * body: { action: "accept" | "decline" }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getCustomerSession();
  if (!session) {
    return Response.json(
      { error: "Only the customer who owns this job can accept or decline quotes." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const quoteId = Number(id);
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "decline" ? "decline" : "accept";

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return Response.json({ error: "Quote not found" }, { status: 404 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, quote.jobId)).limit(1);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

  const ownsJob =
    job.customerId === session.id || job.customerEmail.toLowerCase() === session.email.toLowerCase();

  if (!ownsJob) {
    return Response.json(
      { error: "You are not authorized to make a decision on this job." },
      { status: 403 },
    );
  }

  if (!["open", "quoted"].includes(job.status) && action === "accept") {
    return Response.json(
      { error: "This job is no longer open for quote acceptance." },
      { status: 409 },
    );
  }

  if (action === "decline") {
    if (quote.status !== "submitted") {
      return Response.json({ error: "Only submitted quotes can be declined." }, { status: 409 });
    }
    await db.update(quotes).set({ status: "declined" }).where(eq(quotes.id, quoteId));
    return Response.json({ ok: true, status: "declined" });
  }

  if (quote.status !== "submitted") {
    return Response.json({ error: "Only submitted quotes can be accepted." }, { status: 409 });
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
