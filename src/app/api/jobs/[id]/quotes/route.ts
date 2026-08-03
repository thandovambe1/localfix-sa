import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, inboxMessages, jobs, payments, providers, quotes } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
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
  const { id } = await params;
  const jobId = Number(id);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const providerId = Number(body.providerId);
  const amount = Number(body.amount);
  if (!providerId || !amount || amount <= 0) {
    return Response.json({ error: "A provider and a valid quote amount are required." }, { status: 400 });
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
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);

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
