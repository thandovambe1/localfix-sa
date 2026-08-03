import { desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { inboxMessages, jobs, providers, quotes } from "@/db/schema";
import { getCustomerSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** List the signed-in customer's inbox, newest first. */
export async function GET() {
  await ready();
  const session = await getCustomerSession();
  if (!session) return Response.json({ messages: [], unread: 0 });

  const rows = await db
    .select()
    .from(inboxMessages)
    .where(or(eq(inboxMessages.customerId, session.id), eq(inboxMessages.customerEmail, session.email)))
    .orderBy(desc(inboxMessages.createdAt))
    .limit(50);

  // Attach quote + provider + job context for quote messages.
  const quoteIds = [...new Set(rows.map((m) => m.quoteId).filter((q): q is number => q !== null))];
  const jobIds = [...new Set(rows.map((m) => m.jobId).filter((j): j is number => j !== null))];

  const [qs, js] = await Promise.all([
    quoteIds.length ? db.select().from(quotes).where(inArray(quotes.id, quoteIds)) : Promise.resolve([]),
    jobIds.length ? db.select().from(jobs).where(inArray(jobs.id, jobIds)) : Promise.resolve([]),
  ]);
  const providerIds = [...new Set((qs as (typeof quotes.$inferSelect)[]).map((q) => q.providerId))];
  const ps = providerIds.length
    ? await db.select().from(providers).where(inArray(providers.id, providerIds))
    : [];

  const quoteById = new Map((qs as (typeof quotes.$inferSelect)[]).map((q) => [q.id, q]));
  const jobById = new Map((js as (typeof jobs.$inferSelect)[]).map((j) => [j.id, j]));
  const providerById = new Map((ps as (typeof providers.$inferSelect)[]).map((p) => [p.id, p]));

  const unread = rows.filter((m) => !m.read).length;

  return Response.json({
    unread,
    messages: rows.map((m) => {
      const quote = m.quoteId ? quoteById.get(m.quoteId) ?? null : null;
      const job = m.jobId ? jobById.get(m.jobId) ?? null : null;
      const provider = quote ? providerById.get(quote.providerId) ?? null : null;
      return { ...m, quote, job, provider };
    }),
  });
}

/** Mark one message, or all, as read. body: { id?: number, all?: boolean } */
export async function POST(request: Request) {
  await ready();
  const session = await getCustomerSession();
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { id?: number; all?: boolean };

  if (body.all) {
    await db
      .update(inboxMessages)
      .set({ read: true })
      .where(or(eq(inboxMessages.customerId, session.id), eq(inboxMessages.customerEmail, session.email)));
    return Response.json({ ok: true });
  }

  const id = Number(body.id);
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  await db
    .update(inboxMessages)
    .set({ read: true })
    .where(eq(inboxMessages.id, id));

  return Response.json({ ok: true });
}
