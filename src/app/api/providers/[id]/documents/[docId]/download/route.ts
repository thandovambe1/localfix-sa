import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, providerDocuments } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Streams a stored compliance document to the Founder/Admin browser as a
 * downloadable attachment. Access is logged to the audit trail.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  await ready();

  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "owner" && session.role !== "admin") {
    return Response.json({ error: "Only the Founder and Admin can download applicant documents." }, { status: 403 });
  }

  const { id, docId } = await params;
  const [document] = await db
    .select()
    .from(providerDocuments)
    .where(and(eq(providerDocuments.id, Number(docId)), eq(providerDocuments.providerId, Number(id))))
    .limit(1);

  if (!document) return Response.json({ error: "Document not found" }, { status: 404 });

  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(document.fileData);
  if (!match) return Response.json({ error: "Stored file is unreadable." }, { status: 500 });

  const [, mime, base64] = match;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    return Response.json({ error: "Stored file is corrupt." }, { status: 500 });
  }

  await db.insert(auditLogs).values({
    actor: session.email,
    action: "document.download",
    target: `provider:${id}/document:${document.id}`,
    detail: `Downloaded ${document.documentType} (${document.fileName})`,
  });

  const safeName = document.fileName.replace(/["\\\r\n]/g, "_");
  const encodedName = encodeURIComponent(safeName);

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName.replace(/[^a-zA-Z0-9._-]/g, "_")}"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
