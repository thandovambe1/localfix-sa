import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, customers, inboxMessages, jobs, payments, providers, quotes } from "@/db/schema";
import { getAdminSession, getProviderSession } from "@/lib/auth";
import { getJobQuotes, ready } from "@/lib/queries";
import { formatZAR } from "@/lib/commission";
import { aliasMapFor, quoteRevealed } from "@/lib/reveal";

export const dynamic = "force-dynamic";

/**
 * Quote list is anonymised. Provider identity is only included for a quote
 * that the customer accepted AND paid for; otherwise it is stripped to an
 * anonymous alias so the platform remains the only meeting point.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const rows = await getJobQuotes(jobId);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  const admin = await getAdminSession();

  const paymentRows = job
    ? await db.select().from(payments).where(eq(payments.jobId, jobId)).limit(1)
    : [];
  const payment = paymentRows[0] ?? null;

  const aliases = aliasMapFor(rows);

  const quotes = rows.map((r) => {
    const revealed = admin || quoteRevealed(r, payment ?? undefined);
    if (revealed) return r;
    return {
      ...r,
      provider: r.provider
        ? {
            ...r.provider,
            businessName: aliases[r.id] ?? "Verified provider",
            ownerName: "Revealed after payment",
            logoUrl: null,
            email: "protected@localfix.co.za",
            phone: "••• ••• ••••",
            whatsapp: null,
            website: null,
            address: null,
          }
        : null,
    };
  });

  return Response.json({ quotes, revealed: Boolean(admin) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const providerSession = await getProviderSession();
  if (!providerSession) {
    return Response.json({ error: "Provider login required." }, { status: 401 });
  }

  const { id } = await params;
  const jobId = Number(id);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Never trust a providerId supplied by the browser. The authenticated
  // provider session is the sole source of identity.
  if (body.providerId !== undefined && Number(body.providerId) !== providerSession.id) {
    return Response.json({ error: "You cannot submit a quote for another provider account." }, { status: 403 });
  }
  const providerId = providerSession.id;
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return Response.json({ error: "A valid quote amount is required." }, { status: 400 });
  }

  const [[job], [provider], [broadcast], [existingQuote]] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1),
    db.select().from(providers).where(eq(providers.id, providerId)).limit(1),
    db
      .select({ id: broadcasts.id })
      .from(broadcasts)
      .where(and(eq(broadcasts.jobId, jobId), eq(broadcasts.providerId, providerId)))
      .limit(1),
    db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(eq(quotes.jobId, jobId), eq(quotes.providerId, providerId)))
      .limit(1),
  ]);

  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
  if (!provider || provider.status !== "active") {
    return Response.json({ error: "Your provider account is not active." }, { status: 403 });
  }
  if (!broadcast) {
    return Response.json({ error: "This job opportunity was not broadcast to your provider account." }, { status: 403 });
  }
  if (!["open", "quoted"].includes(job.status)) {
    return Response.json({ error: "This job is no longer accepting quotes." }, { status: 409 });
  }
  if (existingQuote) {
    return Response.json({ error: "You have already submitted a quote for this job." }, { status: 409 });
  }

  const [quote] = await db
    .insert(quotes)
    .values({
      jobId,
      providerId,
      amount: Math.round(amount),
      message: String(body.message ?? ""),
      availability: String(body.availability ?? "Within 48 hours"),
      warrantyMonths: Number(body.warrantyMonths ?? 6),
      includesMaterials: body.includesMaterials !== false,
    })
    .returning();

  await db.update(jobs).set({ status: "quoted" }).where(eq(jobs.id, jobId));

  // ── Deliver the quote straight to the customer's inbox ──

  if (job && provider) {
    let customerId: number | null = job.customerId ?? null;
    if (!customerId) {
      const [match] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, job.customerEmail.toLowerCase()))
        .limit(1);
      customerId = match?.id ?? null;
    }

    await db.insert(inboxMessages).values({
      customerId,
      customerEmail: job.customerEmail,
      type: "new_quote",
      title: `New quote received for "${job.title}"`,
      body: `A verified ${job.categorySlug.replace(/-/g, " ")} professional quoted ${formatZAR(quote.amount * 100)} on the official LocalFix quote template. Availability: ${quote.availability}. Their identity is revealed once you accept a quote and payment clears. Your quoting agent has re-ranked all quotes.`,
      jobId,
      quoteId: quote.id,
    });
  }

  return Response.json({ quote }, { status: 201 });
}
