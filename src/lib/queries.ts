import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/db/seed";
import {
  auditLogs,
  broadcasts,
  customers,
  inboxMessages,
  jobCards,
  jobSignatures,
  jobs,
  messages,
  payments,
  providers,
  quotes,
  reviews,
  walletTransactions,
  withdrawals,
} from "@/db/schema";
import type {
  Job,
  Provider,
  Quote,
  Review,
  Message,
  Payment,
  Customer,
  WalletTransaction,
} from "@/db/schema";
import { haversineKm } from "@/lib/geo";
import { num } from "@/lib/format";

export async function ready() {
  await ensureSeeded();
}

export async function getProviders(filters: {
  category?: string;
  province?: string;
  city?: string;
  q?: string;
  minRating?: number;
  verifiedOnly?: boolean;
  emergency?: boolean;
  limit?: number;
} = {}): Promise<Provider[]> {
  await ready();
  const rows = await db.select().from(providers).orderBy(desc(providers.rating));
  const q = filters.q?.trim().toLowerCase();
  return rows
    .filter((p) => p.status !== "suspended")
    .filter((p) => (filters.category ? p.categories.includes(filters.category) : true))
    .filter((p) => (filters.province ? p.province === filters.province : true))
    .filter((p) => (filters.city ? p.city.toLowerCase() === filters.city.toLowerCase() : true))
    .filter((p) => (filters.minRating ? num(p.rating) >= filters.minRating : true))
    .filter((p) => (filters.emergency ? p.emergencyAvailable : true))
    .filter((p) => (filters.verifiedOnly ? p.badges.includes("identity") && p.badges.includes("business") : true))
    .filter((p) =>
      q
        ? p.businessName.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.categories.some((c) => c.includes(q))
        : true,
    )
    .slice(0, filters.limit ?? 100);
}

export async function getProvider(id: number) {
  await ready();
  const [p] = await db.select().from(providers).where(eq(providers.id, id)).limit(1);
  return p ?? null;
}

export async function getProviderReviews(id: number): Promise<Review[]> {
  await ready();
  return db.select().from(reviews).where(eq(reviews.providerId, id)).orderBy(desc(reviews.createdAt));
}

export async function getJobs(filters: { status?: string; limit?: number } = {}): Promise<Job[]> {
  await ready();
  const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  return rows.filter((j) => (filters.status ? j.status === filters.status : true)).slice(0, filters.limit ?? 100);
}

export async function getJob(id: number) {
  await ready();
  const [j] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return j ?? null;
}

/** True when this customer has an accepted AND paid quote from the provider. */
export async function customerHasPaidProvider(
  customerId: number,
  customerEmail: string,
  providerId: number,
): Promise<boolean> {
  await ready();
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(jobs, eq(jobs.id, payments.jobId))
    .where(
      and(
        eq(payments.providerId, providerId),
        sql`${payments.status} in ('paid', 'paid_out')`,
        or(eq(jobs.customerId, customerId), sql`lower(${jobs.customerEmail}) = lower(${customerEmail})`),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getJobQuotes(jobId: number): Promise<(Quote & { provider: Provider | null })[]> {
  await ready();
  const qs = await db.select().from(quotes).where(eq(quotes.jobId, jobId)).orderBy(desc(quotes.createdAt));
  if (!qs.length) return [];
  const ids = [...new Set(qs.map((q) => q.providerId))];
  const ps = await db.select().from(providers).where(inArray(providers.id, ids));
  const map = new Map(ps.map((p) => [p.id, p]));
  return qs.map((q) => ({ ...q, provider: map.get(q.providerId) ?? null }));
}

export async function getJobMessages(jobId: number): Promise<Message[]> {
  await ready();
  return db.select().from(messages).where(eq(messages.jobId, jobId)).orderBy(messages.createdAt);
}

export async function getJobBroadcasts(jobId: number) {
  await ready();
  const rows = await db.select().from(broadcasts).where(eq(broadcasts.jobId, jobId)).orderBy(desc(broadcasts.matchScore));
  if (!rows.length) return [];
  const ps = await db.select().from(providers).where(inArray(providers.id, rows.map((r) => r.providerId)));
  const map = new Map(ps.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, provider: map.get(r.providerId) ?? null }));
}

/** Jobs broadcast to a specific provider, with their quote if any. */
export async function getProviderPipeline(providerId: number) {
  await ready();
  const bs = await db.select().from(broadcasts).where(eq(broadcasts.providerId, providerId));
  const myQuotes = await db.select().from(quotes).where(eq(quotes.providerId, providerId));
  const jobIds = [...new Set([...bs.map((b) => b.jobId), ...myQuotes.map((q) => q.jobId)])];
  const js = jobIds.length ? await db.select().from(jobs).where(inArray(jobs.id, jobIds)) : [];
  const quoteByJob = new Map(myQuotes.map((q) => [q.jobId, q]));
  const enriched = js.map((j) => ({ job: j, quote: quoteByJob.get(j.id) ?? null }));
  return {
    incoming: enriched.filter((e) => !e.quote && e.job.status === "open"),
    quoted: enriched.filter((e) => e.quote && e.quote.status === "submitted"),
    accepted: enriched.filter((e) => e.quote && e.quote.status === "accepted" && e.job.status !== "completed"),
    completed: enriched.filter((e) => e.job.status === "completed"),
    all: enriched,
  };
}

export async function getStats() {
  await ready();
  const [row] = await db
    .select({
      providerCount: sql<number>`(select count(*)::int from providers)`,
      activeProviders: sql<number>`(select count(*)::int from providers where status = 'active')`,
      jobCount: sql<number>`(select count(*)::int from jobs)`,
      openJobs: sql<number>`(select count(*)::int from jobs where status = 'open')`,
      quoteCount: sql<number>`(select count(*)::int from quotes)`,
      reviewCount: sql<number>`(select count(*)::int from reviews)`,
      avgRating: sql<string>`(select coalesce(round(avg(rating), 2), 0)::text from reviews)`,
      avgResponse: sql<string>`(select coalesce(round(avg(response_minutes)), 0)::text from providers)`,
      quoteValue: sql<string>`(select coalesce(sum(amount), 0)::text from quotes)`,
    })
    .from(sql`(select 1) as t`);
  return row;
}

/** Match active providers to a job location + category. */
export async function matchProviders(job: {
  categorySlug: string;
  lat: number;
  lng: number;
  radiusKm?: number;
}) {
  await ready();
  const rows = await db.select().from(providers).where(and(eq(providers.status, "active")));
  return rows
    .map((p) => ({
      provider: p,
      distanceKm: haversineKm(job.lat, job.lng, num(p.lat), num(p.lng)),
    }))
    .filter((r) => r.provider.categories.includes(job.categorySlug))
    .filter((r) => r.distanceKm <= Math.max(r.provider.serviceRadiusKm, job.radiusKm ?? 0))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// ───────────────────────── Payment Queries ─────────────────────────

export async function getPaymentByJobId(jobId: number): Promise<Payment | null> {
  await ready();
  const [p] = await db.select().from(payments).where(eq(payments.jobId, jobId)).orderBy(desc(payments.createdAt)).limit(1);
  return p ?? null;
}

export async function getPaymentsByProvider(providerId: number): Promise<Payment[]> {
  await ready();
  return db.select().from(payments).where(eq(payments.providerId, providerId)).orderBy(desc(payments.createdAt));
}

export async function getAllPayments(limit = 50): Promise<Payment[]> {
  await ready();
  return db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
}

/** Payments joined with their job + provider, for the admin payments console. */
export async function getPaymentsDetailed(filters: { payoutStatus?: string; status?: string } = {}) {
  await ready();
  const rows = await db.select().from(payments).orderBy(desc(payments.createdAt));
  const filtered = rows
    .filter((p) => (filters.status ? p.status === filters.status : true))
    .filter((p) => (filters.payoutStatus ? p.payoutStatus === filters.payoutStatus : true));

  if (!filtered.length) return [];

  const providerIds = [...new Set(filtered.map((p) => p.providerId))];
  const jobIds = [...new Set(filtered.map((p) => p.jobId))];
  const [ps, js] = await Promise.all([
    db.select().from(providers).where(inArray(providers.id, providerIds)),
    db.select().from(jobs).where(inArray(jobs.id, jobIds)),
  ]);
  const providerMap = new Map(ps.map((p) => [p.id, p]));
  const jobMap = new Map(js.map((j) => [j.id, j]));

  return filtered.map((p) => ({
    ...p,
    provider: providerMap.get(p.providerId) ?? null,
    job: jobMap.get(p.jobId) ?? null,
  }));
}

// ───────────────────────── Customer & wallet queries ─────────────────────────

export async function getCustomer(id: number): Promise<Customer | null> {
  await ready();
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return c ?? null;
}

export async function getWalletTransactions(customerId: number, limit = 20): Promise<WalletTransaction[]> {
  await ready();
  return db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.customerId, customerId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
}

export async function getJobsForCustomer(customerId: number, email?: string) {
  await ready();
  const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const mine = rows.filter(
    (j) => j.customerId === customerId || (email ? j.customerEmail.toLowerCase() === email.toLowerCase() : false),
  );
  if (!mine.length) return [];

  const [allQuotes, cards] = await Promise.all([
    db.select().from(quotes),
    db.select({ jobId: jobCards.jobId, status: jobCards.status, locked: jobCards.locked }).from(jobCards),
  ]);
  const countByJob = new Map<number, number>();
  for (const q of allQuotes) countByJob.set(q.jobId, (countByJob.get(q.jobId) ?? 0) + 1);
  const cardByJob = new Map(cards.map((card) => [card.jobId, card]));

  return mine.map((j) => ({
    ...j,
    quoteCount: countByJob.get(j.id) ?? 0,
    jobCard: cardByJob.get(j.id) ?? null,
  }));
}

/** All customers with job counts and spend, for the admin console. */
export async function getCustomersDetailed() {
  await ready();
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  if (!rows.length) return [];

  const [allJobs, allPayments] = await Promise.all([
    db.select().from(jobs),
    db.select().from(payments),
  ]);

  return rows.map((c) => {
    const theirJobs = allJobs.filter(
      (j) => j.customerId === c.id || j.customerEmail.toLowerCase() === c.email.toLowerCase(),
    );
    const jobIds = new Set(theirJobs.map((j) => j.id));
    const theirPayments = allPayments.filter((p) => jobIds.has(p.jobId));
    return {
      ...c,
      jobCount: theirJobs.length,
      openJobs: theirJobs.filter((j) => j.status === "open" || j.status === "quoted").length,
      completedJobs: theirJobs.filter((j) => j.status === "completed").length,
      jobs: theirJobs,
      spentCents: theirPayments
        .filter((p) => p.status === "paid" || p.status === "paid_out")
        .reduce((s, p) => s + p.totalAmountCents, 0),
    };
  });
}

export async function getWithdrawalsForCustomer(customerId: number, limit = 10) {
  await ready();
  return db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.customerId, customerId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(limit);
}

export async function getWithdrawalsDetailed(status?: string) {
  await ready();
  const rows = await db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt));
  const filtered = status ? rows.filter((w) => w.status === status) : rows;
  if (!filtered.length) return [];
  const custRows = await db
    .select()
    .from(customers)
    .where(inArray(customers.id, [...new Set(filtered.map((w) => w.customerId))]));
  const map = new Map(custRows.map((c) => [c.id, c]));
  return filtered.map((w) => ({ ...w, customer: map.get(w.customerId) ?? null }));
}

export async function getWithdrawalStats() {
  await ready();
  const [row] = await db
    .select({
      pending: sql<number>`count(*) filter (where status in ('requested', 'approved', 'processing'))::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
      pendingCents: sql<string>`coalesce(sum(amount_cents) filter (where status in ('requested', 'approved', 'processing')), 0)::text`,
      completedCents: sql<string>`coalesce(sum(amount_cents) filter (where status = 'completed'), 0)::text`,
    })
    .from(withdrawals);
  return row;
}

/**
 * Professionals the customer has genuinely completed jobs with.
 *
 * Derived from authoritative completed-job records:
 *   job.status = 'completed'
 *   + an accepted quote linking to the provider
 *   + the job belongs to this customer
 *
 * Returns one entry per provider (deduplicated), with aggregate stats
 * and the customer's review if one exists.
 */
export async function getCompletedProfessionals(customerId: number, customerEmail: string) {
  await ready();

  const completedJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const mine = completedJobs.filter(
    (j) =>
      j.status === "completed" &&
      (j.customerId === customerId || j.customerEmail.toLowerCase() === customerEmail.toLowerCase()),
  );
  if (!mine.length) return [];

  const acceptedQuotes = await db.select().from(quotes);
  const quotesByJob = new Map<number, (typeof quotes.$inferSelect)[]>();
  for (const q of acceptedQuotes) {
    if (q.status !== "accepted") continue;
    const arr = quotesByJob.get(q.jobId) ?? [];
    arr.push(q);
    quotesByJob.set(q.jobId, arr);
  }

  const providerIds = new Set<number>();
  const jobsByProvider = new Map<number, typeof mine>();

  for (const job of mine) {
    const accepted = quotesByJob.get(job.id);
    if (!accepted?.length) continue;
    const providerId = accepted[0].providerId;
    providerIds.add(providerId);
    const arr = jobsByProvider.get(providerId) ?? [];
    arr.push(job);
    jobsByProvider.set(providerId, arr);
  }

  if (!providerIds.size) return [];

  const providerRows = await db
    .select()
    .from(providers)
    .where(inArray(providers.id, [...providerIds]));
  const providerMap = new Map(providerRows.map((p) => [p.id, p]));

  const allReviews = await db.select().from(reviews);
  const reviewsByProvider = new Map<number, (typeof reviews.$inferSelect)[]>();
  for (const r of allReviews) {
    if (!providerIds.has(r.providerId)) continue;
    const jobBelongsToCustomer = mine.some((j) => j.id === r.jobId);
    if (r.jobId && !jobBelongsToCustomer) continue;
    const arr = reviewsByProvider.get(r.providerId) ?? [];
    arr.push(r);
    reviewsByProvider.set(r.providerId, arr);
  }

  return [...providerIds]
    .map((pid) => {
      const provider = providerMap.get(pid);
      if (!provider) return null;
      const completedJobsForProvider = jobsByProvider.get(pid) ?? [];
      const myReviews = reviewsByProvider.get(pid) ?? [];
      const avgRating = myReviews.length
        ? myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length
        : null;
      const latestReview = myReviews.sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      )[0] ?? null;
      const lastCompletedJob = completedJobsForProvider[0] ?? null;

      return {
        provider,
        completedJobCount: completedJobsForProvider.length,
        lastCompletedAt: lastCompletedJob?.createdAt ?? null,
        lastJobTitle: lastCompletedJob?.title ?? null,
        lastJobCategory: lastCompletedJob?.categorySlug ?? null,
        avgRating,
        reviewCount: myReviews.length,
        latestReview,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (b.lastCompletedAt?.getTime() ?? 0) - (a.lastCompletedAt?.getTime() ?? 0));
}

export async function getInboxMessages(customerId: number, email: string, limit = 4) {
  await ready();
  return db
    .select()
    .from(inboxMessages)
    .where(or(eq(inboxMessages.customerId, customerId), eq(inboxMessages.customerEmail, email)))
    .orderBy(desc(inboxMessages.createdAt))
    .limit(limit);
}

export async function getCustomerStats() {
  await ready();
  const [row] = await db
    .select({
      totalCustomers: sql<number>`count(*)::int`,
      activeCustomers: sql<number>`count(*) filter (where status = 'active')::int`,
      newThisMonth: sql<number>`count(*) filter (where created_at > now() - interval '30 days')::int`,
      walletFloatCents: sql<string>`coalesce(sum(wallet_cents), 0)::text`,
      fundedWallets: sql<number>`count(*) filter (where wallet_cents > 0)::int`,
    })
    .from(customers);
  return row;
}

export async function getAuditLogs(limit = 20) {
  await ready();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

/** Jobs enriched with quote counts for the admin requests console. */
export async function getJobsDetailed(filters: { status?: string } = {}) {
  await ready();
  const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const filtered = rows.filter((j) => (filters.status ? j.status === filters.status : true));
  if (!filtered.length) return [];

  const [allQuotes, cards, signatures] = await Promise.all([
    db.select().from(quotes),
    db.select().from(jobCards),
    db.select().from(jobSignatures),
  ]);
  const countByJob = new Map<number, number>();
  const bestByJob = new Map<number, number>();
  for (const q of allQuotes) {
    countByJob.set(q.jobId, (countByJob.get(q.jobId) ?? 0) + 1);
    const current = bestByJob.get(q.jobId);
    if (current === undefined || q.amount < current) bestByJob.set(q.jobId, q.amount);
  }

  const cardByJob = new Map(cards.map((card) => [card.jobId, card]));
  const sigByCardRole = new Map(signatures.map((sig) => [`${sig.jobCardId}:${sig.signerRole}`, sig]));

  return filtered.map((j) => {
    const card = cardByJob.get(j.id) ?? null;
    return {
      ...j,
      quoteCount: countByJob.get(j.id) ?? 0,
      bestQuote: bestByJob.get(j.id) ?? null,
      jobCard: card,
      providerSignature: card ? sigByCardRole.get(`${card.id}:provider`) ?? null : null,
      customerSignature: card ? sigByCardRole.get(`${card.id}:customer`) ?? null : null,
    };
  });
}

export async function getPaymentStats() {
  await ready();
  const [row] = await db
    .select({
      totalPayments: sql<number>`count(*)::int`,
      paidPayments: sql<number>`count(*) filter (where status in ('paid', 'paid_out'))::int`,
      totalRevenueCents: sql<string>`coalesce(sum(total_amount_cents) filter (where status in ('paid', 'paid_out')), 0)::text`,
      totalCommissionCents: sql<string>`coalesce(sum(commission_cents) filter (where status in ('paid', 'paid_out')), 0)::text`,
      totalPayoutsCents: sql<string>`coalesce(sum(provider_payout_cents) filter (where status in ('paid', 'paid_out')), 0)::text`,
      pendingPayoutsCents: sql<string>`coalesce(sum(provider_payout_cents) filter (where payout_status in ('payout_pending', 'requested', 'processing')), 0)::text`,
      requestedCount: sql<number>`count(*) filter (where payout_status = 'requested')::int`,
      processingCount: sql<number>`count(*) filter (where payout_status = 'processing')::int`,
      completedPayouts: sql<number>`count(*) filter (where payout_status = 'completed')::int`,
      releasedCents: sql<string>`coalesce(sum(provider_payout_cents) filter (where payout_status = 'completed'), 0)::text`,
    })
    .from(payments);
  return row;
}
