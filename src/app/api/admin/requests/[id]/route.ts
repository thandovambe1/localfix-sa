import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, broadcasts, inboxMessages, jobs, messages, payments, quotes } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/requests/[id]
 *
 * Deletes a customer job request and all related child records (quotes,
 * messages, broadcasts, payments, inbox notifications) atomically in a transaction.
 *
 * Strictly restricted to Founder (owner) and Admin roles.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();

  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return Response.json(
      { error: "Only the Founder and Admin have ultimate control to delete job requests." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const jobId = Number(id);

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) {
    return Response.json({ error: "Job request not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    // Delete all related records first to maintain referential integrity
    await tx.delete(quotes).where(eq(quotes.jobId, jobId));
    await tx.delete(broadcasts).where(eq(broadcasts.jobId, jobId));
    await tx.delete(messages).where(eq(messages.jobId, jobId));
    await tx.delete(payments).where(eq(payments.jobId, jobId));
    await tx.delete(inboxMessages).where(eq(inboxMessages.jobId, jobId));

    // Finally delete the job itself
    await tx.delete(jobs).where(eq(jobs.id, jobId));

    // Log this action to the audit logs
    await tx.insert(auditLogs).values({
      actor: session.email,
      action: "job.delete",
      target: job.reference,
      detail: `Deleted job "${job.title}" (ID: ${jobId}, Posted by: ${job.customerName})`,
    });
  });

  return Response.json({ ok: true, message: `Job request ${job.reference} and all related data deleted successfully.` });
}
