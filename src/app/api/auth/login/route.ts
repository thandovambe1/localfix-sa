import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { buildCookie, createCustomerToken, verifyPassword, CUSTOMER_COOKIE } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(sql`lower(${customers.email}) = ${email}`)
    .limit(1);

  // Generic message — never reveal whether the account exists.
  const invalid = Response.json({ error: "Invalid email or password." }, { status: 401 });
  if (!customer || customer.status !== "active") return invalid;
  if (!verifyPassword(password, customer.passwordHash)) return invalid;

  await db.update(customers).set({ lastLoginAt: new Date() }).where(eq(customers.id, customer.id));

  const res = Response.json({
    ok: true,
    customer: { id: customer.id, name: customer.name, email: customer.email, walletCents: customer.walletCents },
  });
  res.headers.append("Set-Cookie", buildCookie(CUSTOMER_COOKIE, createCustomerToken(customer)));
  return res;
}
