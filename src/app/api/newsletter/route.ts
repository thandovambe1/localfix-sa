import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as { email?: string; source?: string };
  const email = String(body.email ?? "").trim();
  if (!email.includes("@")) return Response.json({ error: "Invalid email" }, { status: 400 });
  await db.insert(subscribers).values({ email, source: String(body.source ?? "footer") });
  return Response.json({ ok: true }, { status: 201 });
}
