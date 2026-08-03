import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, inboxMessages } from "@/db/schema";
import { buildCookie, getCustomerSession, CUSTOMER_COOKIE } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return Response.json({ customer: null });

  await ready();
  const [customer] = await db.select().from(customers).where(eq(customers.id, session.id)).limit(1);
  if (!customer) return Response.json({ customer: null });

  const unreadRows = await db
    .select({ id: inboxMessages.id })
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.read, false),
        or(eq(inboxMessages.customerId, customer.id), eq(inboxMessages.customerEmail, customer.email)),
      ),
    );

  return Response.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      walletCents: customer.walletCents,
      inboxUnread: unreadRows.length,
    },
  });
}

export async function POST() {
  // Sign out
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", buildCookie(CUSTOMER_COOKIE, "", 0));
  return res;
}
