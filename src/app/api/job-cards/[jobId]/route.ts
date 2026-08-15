import { authorizeJobCard, getJobCardBundle } from "@/lib/job-cards";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const { jobId: raw } = await params;
  const bundle = await getJobCardBundle(Number(raw));
  if (!bundle) return Response.json({ error: "Job not found." }, { status: 404 });

  const actor = await authorizeJobCard(bundle.job, bundle.card);
  if (!actor) return Response.json({ error: "You are not authorized to access this Job Card." }, { status: 403 });

  return Response.json({ ...bundle, actor });
}
