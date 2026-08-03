import { analyseJob } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const analysis = analyseJob({
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    categorySlug: body.categorySlug ? String(body.categorySlug) : undefined,
    budgetMax: body.budgetMax ? Number(body.budgetMax) : null,
    photos: Number(body.photos ?? 0),
    hasAddress: Boolean(body.hasAddress),
    hasTimes: Boolean(body.hasTimes),
  });
  return Response.json(analysis);
}
