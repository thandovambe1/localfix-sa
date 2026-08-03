import { eq } from "drizzle-orm";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { buildCookie, getProviderSession, PROVIDER_COOKIE } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getProviderSession();
  if (!session) return Response.json({ provider: null });

  await ready();
  const [provider] = await db.select().from(providers).where(eq(providers.id, session.id)).limit(1);
  if (!provider) return Response.json({ provider: null });

  return Response.json({
    provider: {
      id: provider.id,
      businessName: provider.businessName,
      email: provider.email,
      status: provider.status,
      plan: provider.plan,
    },
  });
}

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", buildCookie(PROVIDER_COOKIE, "", 0));
  return res;
}
