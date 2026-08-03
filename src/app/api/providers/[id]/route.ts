import { eq } from "drizzle-orm";
import { db } from "@/db";
import { providerDocuments, providers } from "@/db/schema";
import { customerHasPaidProvider, getProvider, ready } from "@/lib/queries";
import { getAdminSession, getCustomerSession } from "@/lib/auth";
import { auditLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * A provider's identity (name, owner, contact, logo) is only returned to:
 *  - authenticated admins, or
 *  - the customer who has an accepted AND paid quote from this provider.
 * Everyone else gets 403 — no browsing, no scraping.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const providerId = Number(id);

  const admin = await getAdminSession();
  if (admin) {
    const provider = await getProvider(providerId);
    if (!provider) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ provider });
  }

  const customer = await getCustomerSession();
  if (customer) {
    const entitled = await customerHasPaidProvider(customer.id, customer.email, providerId);
    if (entitled) {
      const provider = await getProvider(providerId);
      if (!provider) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ provider });
    }
  }

  return Response.json(
    { error: "Provider details are revealed after you accept a quote and payment clears." },
    { status: 403 },
  );
}

/**
 * Admin actions:
 * { status?: "active" | "pending" | "suspended", badges?: string[],
 *   plan?: "free" | "pro" | "premium", provinces?: string[] }
 *
 * Business rule enforced here: the free Starter plan covers exactly one
 * province. Multiple provinces (branches) require a paid plan.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    badges?: string[];
    plan?: string;
    provinces?: string[];
  };

  const current = await getProvider(Number(id));
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  const nextPlan =
    body.plan && ["free", "pro", "premium"].includes(body.plan) ? (body.plan as "free" | "pro" | "premium") : current.plan;
  const nextProvinces = Array.isArray(body.provinces)
    ? [...new Set(body.provinces.map(String).filter(Boolean))]
    : current.provinces;

  if (nextPlan === "free" && nextProvinces.length > 1) {
    return Response.json(
      { error: "The free Starter plan covers one province only. Choose a paid plan for multiple branches." },
      { status: 400 },
    );
  }

  if (body.status === "active") {
    const documents = await db
      .select()
      .from(providerDocuments)
      .where(eq(providerDocuments.providerId, current.id));
    const approved = new Set(documents.filter((document) => document.status === "approved").map((document) => document.documentType));
    const coreRequired = ["id", "cipc", "insurance_schedule", "proof_of_address", "bank_confirmation"];
    const regulated = current.categories.some((category) =>
      ["plumbing", "electrical", "solar", "security", "air-conditioning", "pest-control", "builders"].includes(category),
    );
    const missing = [...coreRequired, ...(regulated ? ["trade_certificate"] : [])].filter((type) => !approved.has(type));
    if (missing.length) {
      return Response.json(
        { error: `Provider cannot be activated until these documents are approved: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }
  }

  const patch: Partial<typeof providers.$inferInsert> = {};
  if (body.status && ["active", "pending", "suspended"].includes(body.status)) patch.status = body.status;
  if (Array.isArray(body.badges)) patch.badges = body.badges.map(String);
  if (body.plan || Array.isArray(body.provinces)) {
    patch.plan = nextPlan;
    patch.provinces = nextProvinces;
    if (nextProvinces.length) patch.province = nextProvinces[0];
  }
  if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update" }, { status: 400 });

  const [provider] = await db.update(providers).set(patch).where(eq(providers.id, Number(id))).returning();

  const what = body.status
    ? `status → ${body.status}`
    : `plan → ${nextPlan}, provinces → ${nextProvinces.join(", ")}`;

  await db.insert(auditLogs).values({
    actor: session.email,
    action: `provider.${body.status ? "status" : "coverage"}`,
    target: `provider:${id}`,
    detail: `${provider?.businessName ?? "Provider"} ${what}`,
  });

  return Response.json({ provider });
}
