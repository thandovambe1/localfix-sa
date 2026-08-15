import { db } from "@/db";
import { auditLogs, jobCardCorrections } from "@/db/schema";
import { getAdminSession } from "@/lib/auth";
import { getJobCardBundle } from "@/lib/job-cards";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const admin = await getAdminSession();
  if (!admin || (admin.role !== "owner" && admin.role !== "admin")) {
    return Response.json({ error: "Founder or Admin access required." }, { status: 403 });
  }

  const { jobId: raw } = await params;
  const jobId = Number(raw);
  const bundle = await getJobCardBundle(jobId);
  if (!bundle?.card) return Response.json({ error: "Job Card not found." }, { status: 404 });
  if (!bundle.card.locked) {
    return Response.json({ error: "Corrections are only used for locked, fully signed Job Cards." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const note = String(body.note ?? "").trim();
  if (note.length < 10 || note.length > 2000) {
    return Response.json({ error: "Correction note must be between 10 and 2,000 characters." }, { status: 400 });
  }

  const [correction] = await db
    .insert(jobCardCorrections)
    .values({ jobCardId: bundle.card.id, jobId, note, createdBy: admin.email })
    .returning();
  await db.insert(auditLogs).values({
    actor: admin.email,
    action: "job_card.correction_added",
    target: bundle.card.documentReference,
    detail: note,
  });

  return Response.json({ ok: true, correction }, { status: 201 });
}
