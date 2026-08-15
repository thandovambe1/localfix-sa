import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobCards, jobs } from "@/db/schema";
import { getProviderSession } from "@/lib/auth";
import { getAcceptedJobContext, getJobCardBundle, jobCardReference } from "@/lib/job-cards";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

function validPhoto(data: unknown): data is string {
  if (typeof data !== "string" || !/^data:image\/(png|jpeg);base64,/.test(data)) return false;
  try {
    const bytes = Buffer.from(data.split(",")[1] ?? "", "base64");
    return bytes.length > 0 && bytes.length <= 750 * 1024;
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const providerSession = await getProviderSession();
  if (!providerSession) return Response.json({ error: "Provider login required." }, { status: 401 });

  const { jobId: raw } = await params;
  const jobId = Number(raw);
  const context = await getAcceptedJobContext(jobId);
  if (!context?.job) return Response.json({ error: "Job not found." }, { status: 404 });
  if (!context.quote || !context.provider || !context.customer) {
    return Response.json({ error: "This job does not have a complete accepted assignment." }, { status: 400 });
  }
  if (context.quote.providerId !== providerSession.id) {
    return Response.json({ error: "You are not the accepted provider for this job." }, { status: 403 });
  }
  if (!context.payment || !["paid", "paid_out"].includes(context.payment.status)) {
    return Response.json(
      { error: "The accepted quote payment must clear before the provider can complete the Job Card." },
      { status: 409 },
    );
  }
  if (!["accepted", "in_progress", "awaiting_provider_signature"].includes(context.job.status)) {
    return Response.json({ error: "This job is not eligible for provider completion." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const workCompleted = String(body.workCompleted ?? "").trim();
  const materialsUsed = String(body.materialsUsed ?? "").trim();
  const additionalNotes = String(body.additionalNotes ?? "").trim();
  const completionPhotos = Array.isArray(body.completionPhotos) ? body.completionPhotos : [];

  if (workCompleted.length < 20) {
    return Response.json({ error: "Describe the work completed in at least 20 characters." }, { status: 400 });
  }
  if (completionPhotos.length > 6 || !completionPhotos.every(validPhoto)) {
    return Response.json(
      { error: "Upload up to 6 PNG or JPG completion photos, maximum 750 KB each." },
      { status: 400 },
    );
  }

  const existing = await getJobCardBundle(jobId);
  if (existing?.card?.locked || existing?.providerSignature) {
    return Response.json({ error: "The Job Card can no longer be edited after the provider signs." }, { status: 409 });
  }

  const card = await db.transaction(async (tx) => {
    let saved;
    if (existing?.card) {
      [saved] = await tx
        .update(jobCards)
        .set({
          workCompleted,
          materialsUsed,
          additionalNotes,
          completionPhotos: completionPhotos as string[],
          finalAmountCents: context.quote!.amount * 100,
          status: "awaiting_provider_signature",
          updatedAt: new Date(),
        })
        .where(eq(jobCards.id, existing.card.id))
        .returning();
    } else {
      [saved] = await tx
        .insert(jobCards)
        .values({
          jobId,
          quoteId: context.quote!.id,
          providerId: context.provider!.id,
          customerId: context.customer!.id,
          documentReference: jobCardReference(context.job.reference),
          workCompleted,
          materialsUsed,
          additionalNotes,
          completionPhotos: completionPhotos as string[],
          finalAmountCents: context.quote!.amount * 100,
          status: "awaiting_provider_signature",
        })
        .returning();
    }

    await tx
      .update(jobs)
      .set({ status: "awaiting_provider_signature" })
      .where(eq(jobs.id, jobId));
    return saved;
  });

  return Response.json({ ok: true, card }, { status: existing?.card ? 200 : 201 });
}
