import { sql } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { buildCookie, createCustomerToken, hashPassword, CUSTOMER_COOKIE } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const phone = String(body.phone ?? "").trim();
  const province = String(body.province ?? "").trim();
  const city = String(body.city ?? "").trim();
  const suburb = String(body.suburb ?? "").trim();
  const address = String(body.address ?? "").trim();
  const contactMethod = String(body.contactMethod ?? "").trim();

  if (name.split(/\s+/).filter(Boolean).length < 2) {
    return Response.json({ error: "Please enter both your first name and surname." }, { status: 400 });
  }
  if (!email.includes("@")) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!phone || phone.replace(/\D/g, "").length < 9) {
    return Response.json({ error: "Please enter a valid cellphone number." }, { status: 400 });
  }
  if (!province || !city || !suburb || !address) {
    return Response.json({ error: "Province, city, suburb and street address are required for your primary property." }, { status: 400 });
  }
  if (!["phone", "whatsapp", "email"].includes(contactMethod)) {
    return Response.json({ error: "Choose a preferred contact method." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (confirmPassword && password !== confirmPassword) {
    return Response.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const existing = await db
    .select({ id: customers.id })
    .from(customers)
    .where(sql`lower(${customers.email}) = ${email}`)
    .limit(1);

  if (existing.length) {
    return Response.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
  }

  const [customer] = await db
    .insert(customers)
    .values({
      name,
      email,
      phone,
      passwordHash: hashPassword(password),
      province,
      city,
      suburb,
      address,
      contactMethod,
      lastLoginAt: new Date(),
    })
    .returning();

  const res = Response.json({
    ok: true,
    customer: { id: customer.id, name: customer.name, email: customer.email, walletCents: customer.walletCents },
  }, { status: 201 });

  res.headers.append("Set-Cookie", buildCookie(CUSTOMER_COOKIE, createCustomerToken(customer)));
  return res;
}
