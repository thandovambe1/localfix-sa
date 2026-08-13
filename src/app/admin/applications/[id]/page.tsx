import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { providerDocuments, providers } from "@/db/schema";
import ApplicationDecisionPanel from "@/components/application-decision-panel";
import { getAdminSession } from "@/lib/auth";
import { ready } from "@/lib/queries";
import { categoryName } from "@/lib/services";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Provider application", robots: { index: false } };

const DOC_LABELS: Record<string, string> = {
  id: "Owner ID document",
  cipc: "CIPC business registration",
  insurance_schedule: "Public liability insurance policy schedule",
  proof_of_address: "Business proof of address",
  bank_confirmation: "Bank account confirmation letter",
  trade_certificate: "Trade certificate / regulatory licence",
};

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await ready();
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "owner" && session.role !== "admin") redirect("/admin");

  const { id } = await params;
  const providerId = Number(id);

  const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
  if (!provider) redirect("/admin/providers");

  const documents = await db
    .select()
    .from(providerDocuments)
    .where(eq(providerDocuments.providerId, providerId))
    .orderBy(providerDocuments.createdAt);

  return (
    <div className="container-page py-8 md:py-12">
      <Link href="/admin/providers" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">
        ← Back to provider applications
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* LEFT — the complete application */}
        <div className="space-y-6">
          {/* Identity */}
          <section className="card p-6">
            <div className="flex flex-wrap items-start gap-4">
              {provider.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={provider.logoUrl}
                  alt={`${provider.businessName} logo`}
                  className="h-16 w-16 rounded-2xl bg-white object-contain ring-1 ring-black/[0.08]"
                />
              ) : (
                <span
                  className="grid h-16 w-16 place-items-center rounded-2xl text-lg font-black text-white"
                  style={{ backgroundColor: provider.accent }}
                  aria-hidden
                >
                  {provider.businessName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">{provider.businessName}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Applied {shortDate(provider.createdAt)} · Reference #{provider.id}
                </p>
                {provider.applicationDecidedAt ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Last decision {shortDate(provider.applicationDecidedAt)} by {provider.applicationDecidedBy}
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Row label="Owner" value={provider.ownerName} />
              <Row label="Email" value={provider.email} href={`mailto:${provider.email}`} />
              <Row label="Cellphone" value={provider.phone} href={`tel:${provider.phone}`} />
              <Row label="WhatsApp" value={provider.whatsapp ?? "—"} />
              <Row label="Website" value={provider.website ?? "—"} href={provider.website || undefined} />
              <Row label="Plan applied" value={provider.plan.toUpperCase()} />
              <Row label="Location" value={`${provider.suburb ? provider.suburb + ", " : ""}${provider.city}, ${provider.province}`} />
              <Row label="Business address" value={provider.address || "—"} />
              <Row label="Service radius" value={`${provider.serviceRadiusKm} km`} />
              <Row label="Operating provinces" value={provider.provinces.join(", ")} />
              <Row label="Experience" value={`${provider.yearsExperience} yrs`} />
              <Row label="Team size" value={`${provider.employees} people`} />
              <Row label="Call-out rate" value={`R${provider.hourlyRate}/hr`} />
              <Row label="Hours" value={provider.operatingHours} />
              <Row label="24/7 emergency" value={provider.emergencyAvailable ? "Yes" : "No"} />
              <Row label="Languages" value={provider.languages.join(", ")} />
            </dl>

            {provider.bio ? (
              <div className="mt-5 rounded-2xl bg-mist p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Business bio</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{provider.bio}</p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {provider.categories.map((c) => (
                <span key={c} className="chip">
                  {categoryName(c)}
                </span>
              ))}
            </div>
          </section>

          {/* Documents */}
          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-navy-800">Uploaded compliance documents</h2>
              <span className="text-xs text-slate-500">{documents.length} files</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Private to Founder &amp; Admin. Every view and download is recorded in the audit log.
            </p>

            {documents.length === 0 ? (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">
                No documents uploaded — this application cannot be approved.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mist text-lg" aria-hidden>
                      {doc.mimeType === "application/pdf" ? "📄" : "🖼️"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy-800">
                        {DOC_LABELS[doc.documentType] ?? doc.documentType}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {doc.fileName} · {(doc.sizeBytes / 1024).toFixed(0)} KB ·{" "}
                        {doc.status === "approved" ? "approved" : doc.status === "rejected" ? "rejected" : "awaiting review"}
                        {doc.reviewedBy ? ` by ${doc.reviewedBy}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={doc.fileData}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost !px-4 !py-2 text-xs"
                      >
                        👁 View
                      </a>
                      <a
                        href={`/api/admin/providers/${provider.id}/documents/${doc.id}/download`}
                        className="btn btn-accent !px-4 !py-2 text-xs"
                      >
                        ⬇ Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — decision */}
        <aside className="space-y-5">
          {provider.applicationNote ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Latest note to applicant</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">{provider.applicationNote}</p>
            </div>
          ) : null}

          <ApplicationDecisionPanel providerId={provider.id} currentStatus={provider.status} />

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Review checklist</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {[
                "ID matches the owner name on the application",
                "CIPC registration is current and matches the business name",
                "Insurance policy schedule is in date and covers the trade",
                "Proof of address is recent (under 3 months)",
                "Bank confirmation matches the payout account holder",
                "Trade licence present for regulated categories",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-teal-600" aria-hidden>
                    ☐
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-navy-800">
        {href ? (
          <a href={href} className="text-teal-700 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
