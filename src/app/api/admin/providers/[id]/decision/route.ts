import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, providerDocuments, providers } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { sendProviderDecisionEmail, type ProviderDecision } from "@/lib/email";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STATUS_FOR: Record<ProviderDecision, string> = {
  approve: "active",
  pending_docs: "pending",
  decline: "declined",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "owner" && session.role !== "admin") {
    return Response.json({ error: "Only the Founder and Admin can record application decisions." }, { status: 403 });
  }

  const { id } = await params;
  const providerId = Number(id);
  const body = (await request.json().catch(() => ({}))) as { decision?: string; note?: string };
  const decision = body.decision as ProviderDecision;

  if (!["approve", "pending_docs", "decline"].includes(decision)) {
    return Response.json({ error: "Invalid decision." }, { status: 400 });
  }

  const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
  if (!provider) return Response.json({ error: "Provider not found" }, { status: 404 });

  // Approval requires every core compliance document to be approved first.
  if (decision === "approve") {
    const documents = await db
      .select()
      .from(providerDocuments)
      .where(eq(providerDocuments.providerId, providerId));
    const approved = new Set(
      documents.filter((d) => d.status === "approved").map((d) => d.documentType),
    );
    const regulated = provider.categories.some((c) =>
      ["plumbing", "electrical", "solar", "security", "air-conditioning", "pest-control", "builders"].includes(c),
    );
    const core = ["id", "cipc", "insurance_schedule", "proof_of_address", "bank_confirmation"];
    const missing = [...core, ...(regulated ? ["trade_certificate"] : [])].filter((t) => !approved.has(t));
    if (missing.length) {
      return Response.json(
        { error: `Approve the compliance documents first: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }
  }

  const note = String(body.note ?? "").trim();
  const now = new Date();

  const [updated] = await db
    .update(providers)
    .set({
      status: STATUS_FOR[decision],
      applicationNote: note,
      applicationDecidedBy: session.email,
      applicationDecidedAt: now,
    })
    .where(eq(providers.id, providerId))
    .returning();

  await db.insert(auditLogs).values({
    actor: session.email,
    action: `application.${decision}`,
    target: `provider:${providerId}`,
    detail: `${provider.businessName} decision: ${decision}${note ? ` — ${note}` : ""}`,
  });

  // Notify the applicant by email of the progress.
  const email = await sendProviderDecisionEmail({
    to: provider.email,
    businessName: provider.businessName,
    ownerName: provider.ownerName,
    decision,
    note,
    decidedBy: `${session.name} (${session.email})`,
  });

  const { passwordHash: _hash, ...safeProvider } = updated;

  return Response.json({
    ok: true,
    provider: safeProvider,
    emailSent: email.ok,
    emailError: email.ok ? undefined : email.error,
  });
}
