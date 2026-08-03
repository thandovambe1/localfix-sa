import { sql } from "drizzle-orm";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { buildCookie, createProviderToken, PROVIDER_COOKIE, verifyPassword } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) return Response.json({ error: "Email and password are required." }, { status: 400 });

  const [provider] = await db.select().from(providers).where(sql`lower(${providers.email}) = ${email}`).limit(1);
  const invalid = Response.json({ error: "Invalid email or password." }, { status: 401 });
  if (!provider || provider.status === "suspended" || !provider.passwordHash) return invalid;
  if (!verifyPassword(password, provider.passwordHash)) return invalid;

  const res = Response.json({
    ok: true,
    provider: { id: provider.id, email: provider.email, businessName: provider.businessName, status: provider.status },
  });
  res.headers.append(
    "Set-Cookie",
    buildCookie(PROVIDER_COOKIE, createProviderToken({ id: provider.id, email: provider.email, name: provider.businessName })),
  );
  return res;
}
