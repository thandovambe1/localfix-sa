import { sql } from "drizzle-orm";
import { db } from "@/db";
import { providerDocuments, providers } from "@/db/schema";
import { getAdminSession, hashPassword } from "@/lib/auth";
import { findCity } from "@/lib/geo";
import { getProviders, ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Provider listing is operations-only. Customers are matched to providers
 * through the job flow — they never browse the directory.
 */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json(
      { error: "Providers are matched to jobs on-platform. Post a request to get quotes." },
      { status: 403 },
    );
  }

  const sp = new URL(request.url).searchParams;
  const rows = await getProviders({
    category: sp.get("category") ?? undefined,
    province: sp.get("province") ?? undefined,
    city: sp.get("city") ?? undefined,
    q: sp.get("q") ?? undefined,
    minRating: sp.get("minRating") ? Number(sp.get("minRating")) : undefined,
    verifiedOnly: sp.get("verifiedOnly") === "true",
    emergency: sp.get("emergency") === "true",
  });
  return Response.json({ providers: rows });
}

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const businessName = String(body.businessName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const categories = Array.isArray(body.categories) ? (body.categories as string[]).map(String) : [];
  const provinces = Array.isArray(body.provinces)
    ? [...new Set((body.provinces as string[]).map(String).filter(Boolean))]
    : [String(body.province ?? "Gauteng")];
  const plan = body.plan === "pro" || body.plan === "premium" ? String(body.plan) : "free";

  const password = String(body.password ?? "");
  const ownerName = String(body.ownerName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").trim();
  const suburb = String(body.suburb ?? "").trim();
  const address = String(body.address ?? "").trim();
  const complianceDocuments = Array.isArray(body.complianceDocuments)
    ? (body.complianceDocuments as Record<string, unknown>[])
    : [];

  if (!businessName || !ownerName || !email.includes("@") || !phone || !whatsapp || !suburb || !address || categories.length === 0) {
    return Response.json(
      {
        error:
          "Business name, owner name, email, cellphone, WhatsApp, suburb, business address and at least one service category are required.",
      },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return Response.json({ error: "Provider password must be at least 8 characters." }, { status: 400 });
  }

  const regulatedCategories = new Set([
    "plumbing",
    "electrical",
    "solar",
    "security",
    "air-conditioning",
    "pest-control",
    "builders",
  ]);
  const requiredDocumentTypes = [
    "id",
    "cipc",
    "insurance_schedule",
    "proof_of_address",
    "bank_confirmation",
    ...(categories.some((category) => regulatedCategories.has(category)) ? ["trade_certificate"] : []),
  ];
  const documentByType = new Map(complianceDocuments.map((document) => [String(document.documentType ?? ""), document]));
  const missingDocuments = requiredDocumentTypes.filter((type) => !documentByType.has(type));
  if (missingDocuments.length) {
    return Response.json(
      { error: `Missing required compliance documents: ${missingDocuments.join(", ")}.` },
      { status: 400 },
    );
  }

  const acceptedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  for (const type of requiredDocumentTypes) {
    const document = documentByType.get(type)!;
    const mimeType = String(document.mimeType ?? "");
    const sizeBytes = Number(document.sizeBytes ?? 0);
    const fileData = String(document.fileData ?? "");
    if (
      !acceptedMimeTypes.has(mimeType) ||
      !Number.isFinite(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > 500 * 1024 ||
      !fileData.startsWith("data:")
    ) {
      return Response.json({ error: `Invalid compliance document upload for ${type}.` }, { status: 400 });
    }
  }

  const [existing] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(sql`lower(${providers.email}) = ${email}`)
    .limit(1);
  if (existing) {
    return Response.json({ error: "A provider account with this email already exists." }, { status: 409 });
  }

  // Business rule: the free Starter plan covers exactly one province.
  // Multiple provinces (branches) require a paid plan.
  if (provinces.length > 1 && plan === "free") {
    return Response.json(
      { error: "Multiple provinces (branches) require a Pro or Premium plan." },
      { status: 400 },
    );
  }

  const cityName = String(body.city ?? "Johannesburg");
  const city = findCity(cityName);

  const provider = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(providers)
      .values({
        businessName,
        ownerName,
        email,
        passwordHash: hashPassword(password),
        phone,
        whatsapp,
        province: String(body.province ?? city?.province ?? "Gauteng"),
        city: city?.city ?? cityName,
        suburb,
        address,
        lat: (city?.lat ?? -26.2041).toFixed(6),
        lng: (city?.lng ?? 28.0473).toFixed(6),
        serviceRadiusKm: Number(body.serviceRadiusKm ?? 30),
        categories,
        provinces,
        languages: Array.isArray(body.languages) ? (body.languages as string[]).map(String) : ["English"],
        badges: [],
        bio: String(body.bio ?? ""),
        website: String(body.website ?? ""),
        logoUrl: body.logoUrl ? String(body.logoUrl) : null,
        yearsExperience: Number(body.yearsExperience ?? 1),
        employees: Number(body.employees ?? 1),
        emergencyAvailable: Boolean(body.emergencyAvailable),
        operatingHours: String(body.operatingHours ?? "Mon–Fri 08:00–17:00"),
        hourlyRate: Number(body.hourlyRate ?? 450),
        rating: "0.00",
        status: "pending",
        plan,
      })
      .returning();

    await tx.insert(providerDocuments).values(
      requiredDocumentTypes.map((type) => {
        const document = documentByType.get(type)!;
        return {
          providerId: created.id,
          documentType: type,
          fileName: String(document.fileName ?? `${type}.pdf`),
          mimeType: String(document.mimeType),
          sizeBytes: Number(document.sizeBytes),
          fileData: String(document.fileData),
          status: "pending",
        };
      }),
    );

    return created;
  });

  return Response.json(
    {
      provider: {
        id: provider.id,
        businessName: provider.businessName,
        email: provider.email,
        status: provider.status,
        plan: provider.plan,
      },
    },
    { status: 201 },
  );
}
