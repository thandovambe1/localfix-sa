import { eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, jobs } from "@/db/schema";
import { analyseJob, matchScore } from "@/lib/ai";
import { findCity } from "@/lib/geo";
import { jobReference, num } from "@/lib/format";
import { getJobs, matchProviders, ready } from "@/lib/queries";
import { getCustomerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getJobs({ limit: 50 });
  return Response.json({ jobs: rows });
}

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const customerEmail = String(body.customerEmail ?? "").trim();

  if (!title || !description || !customerEmail.includes("@")) {
    return Response.json({ error: "Title, description and a valid email are required." }, { status: 400 });
  }

  const cityName = String(body.city ?? "Johannesburg");
  const city = findCity(cityName);
  const lat = body.lat ? num(body.lat) : (city?.lat ?? -26.2041);
  const lng = body.lng ? num(body.lng) : (city?.lng ?? 28.0473);

  const budgetMin = body.budgetMin ? Number(body.budgetMin) : null;
  const budgetMax = body.budgetMax ? Number(body.budgetMax) : null;
  const photos = Array.isArray(body.photos) ? (body.photos as string[]).map(String) : [];

  const ai = analyseJob({
    title,
    description,
    categorySlug: body.categorySlug ? String(body.categorySlug) : undefined,
    budgetMax,
    photos: photos.length,
    hasAddress: Boolean(body.address),
    hasTimes: Boolean(body.preferredTimes),
  });

  const urgency = String(body.urgency ?? "this-week");
  const deadlineHours = urgency === "emergency" ? 2 : urgency === "today" ? 6 : urgency === "this-week" ? 24 : 48;

  const session = await getCustomerSession();

  const [job] = await db
    .insert(jobs)
    .values({
      customerId: session?.id ?? null,
      reference: jobReference(),
      categorySlug: ai.categorySlug,
      title,
      description,
      address: String(body.address ?? ""),
      suburb: String(body.suburb ?? ""),
      city: city?.city ?? cityName,
      province: String(body.province ?? city?.province ?? "Gauteng"),
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      urgency,
      budgetMin,
      budgetMax,
      contactMethod: String(body.contactMethod ?? "whatsapp"),
      preferredTimes: String(body.preferredTimes ?? ""),
      photos,
      customerName: String(body.customerName ?? "Customer"),
      customerEmail,
      customerPhone: String(body.customerPhone ?? ""),
      aiSummary: ai.summary,
      aiComplexity: ai.complexity,
      aiBudgetLow: ai.budgetLow,
      aiBudgetHigh: ai.budgetHigh,
      quoteDeadline: new Date(Date.now() + deadlineHours * 3600_000),
    })
    .returning();

  // BROADCAST: notify every matching, active provider inside the service radius.
  const matches = await matchProviders({ categorySlug: ai.categorySlug, lat, lng, radiusKm: 20 });
  const channels = ["push", "email", ...(urgency === "emergency" ? ["sms", "whatsapp"] : ["whatsapp"])];

  if (matches.length) {
    await db.insert(broadcasts).values(
      matches.slice(0, 25).map((m) => ({
        jobId: job.id,
        providerId: m.provider.id,
        distanceKm: m.distanceKm.toFixed(2),
        matchScore: matchScore({
          distanceKm: m.distanceKm,
          radiusKm: m.provider.serviceRadiusKm,
          rating: num(m.provider.rating),
          responseMinutes: m.provider.responseMinutes,
          jobsCompleted: m.provider.jobsCompleted,
          emergency: m.provider.emergencyAvailable,
          isEmergencyJob: urgency === "emergency",
        }),
        channels,
      })),
    );
    await db
      .update(jobs)
      .set({ broadcastCount: Math.min(matches.length, 25) })
      .where(eq(jobs.id, job.id));
  }

  return Response.json({ job, matched: matches.length, ai }, { status: 201 });
}
