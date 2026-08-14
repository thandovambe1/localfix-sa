import { eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, jobs } from "@/db/schema";
import { analyseJob, matchScore } from "@/lib/ai";
import { findCity } from "@/lib/geo";
import { jobReference, num, zar } from "@/lib/format";
import { getCustomer, getJobs, matchProviders, ready } from "@/lib/queries";
import { getCustomerSession } from "@/lib/auth";
import { sendJobConfirmationEmail } from "@/lib/email";
import { categoryName, urgencyLabel } from "@/lib/services";

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

  if (!title || !description) {
    return Response.json({ error: "Title and description are required." }, { status: 400 });
  }

  // A booking can only be submitted by a signed-in customer — enforced on
  // the server so the rule can't be bypassed by calling the API directly.
  const session = await getCustomerSession();
  if (!session) {
    return Response.json(
      { error: "Please sign in or create a free account before submitting a job request." },
      { status: 401 },
    );
  }
  const account = await getCustomer(session.id);
  if (!account || account.status !== "active") {
    return Response.json({ error: "Your account is not active." }, { status: 403 });
  }
  const customerEmail = account.email;

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

  const [job] = await db
    .insert(jobs)
    .values({
      customerId: account.id,
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
      customerName: String(body.customerName ?? account.name),
      customerEmail,
      customerPhone: String(body.customerPhone ?? account.phone),
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

  // Send the customer a real confirmation email that the job was requested
  // and broadcast. Non-blocking: emailing must never fail the request.
  const emailResult = await sendJobConfirmationEmail({
    to: customerEmail,
    customerName: account.name,
    reference: job.reference,
    jobId: job.id,
    title,
    categoryName: categoryName(ai.categorySlug),
    urgencyLabel: urgencyLabel(urgency),
    city: job.city,
    suburb: job.suburb,
    budget: budgetMin || budgetMax ? `${zar(budgetMin)} – ${zar(budgetMax)}` : undefined,
    fairRange: `${zar(ai.budgetLow)} – ${zar(ai.budgetHigh)}`,
    matched: Math.min(matches.length, 25),
  }).catch(() => ({ ok: false as const, error: "Email dispatch failed" }));

  return Response.json(
    { job, matched: matches.length, ai, emailSent: emailResult.ok },
    { status: 201 },
  );
}
