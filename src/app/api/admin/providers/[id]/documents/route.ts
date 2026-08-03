import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, providerDocuments, providers } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const providerId = Number(id);
  const rows = await db
    .select()
    .from(providerDocuments)
    .where(eq(providerDocuments.providerId, providerId))
    .orderBy(providerDocuments.createdAt);

  return Response.json({ documents: rows });
}

/** body: { documentId, action: "approve" | "reject" } */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const providerId = Number(id);
  const body = (await request.json().catch(() => ({}))) as { documentId?: number; action?: string };
  const documentId = Number(body.documentId);
  const status = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "";
  if (!documentId || !status) return Response.json({ error: "documentId and valid action are required" }, { status: 400 });

  const [document] = await db
    .update(providerDocuments)
    .set({ status, reviewedBy: session.email, reviewedAt: new Date() })
    .where(and(eq(providerDocuments.id, documentId), eq(providerDocuments.providerId, providerId)))
    .returning();
  if (!document) return Response.json({ error: "Document not found" }, { status: 404 });

  // Update verification badges only when every required document is approved.
  const all = await db.select().from(providerDocuments).where(eq(providerDocuments.providerId, providerId));
  const required = ["id", "cipc", "insurance_schedule", "proof_of_address", "bank_confirmation"];
  const approvedTypes = new Set(all.filter((d) => d.status === "approved").map((d) => d.documentType));
  const allCoreApproved = required.every((type) => approvedTypes.has(type));

  const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
  if (provider && allCoreApproved) {
    const badges = new Set(provider.badges);
    badges.add("identity");
    badges.add("business");
    badges.add("insurance");
    await db.update(providers).set({ badges: [...badges] }).where(eq(providers.id, providerId));
  }

  await db.insert(auditLogs).values({
    actor: session.email,
    action: `provider_document.${status}`,
    target: `provider:${providerId}/document:${documentId}`,
    detail: `${document.documentType} ${status}`,
  });

  return Response.json({ document, allCoreApproved });
}
