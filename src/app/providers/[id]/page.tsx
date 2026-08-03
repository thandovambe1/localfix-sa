import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Stars, StatusPill, VerificationBadge } from "@/components/ui";
import { getProvider, getProviderReviews } from "@/lib/queries";
import { categoryIcon, categoryName } from "@/lib/services";
import { num, timeAgo, zar } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const provider = await getProvider(Number(id));
  if (!provider) return { title: "Provider not found" };
  return {
    title: `${provider.businessName} — ${provider.city}`,
    description: provider.bio,
  };
}

export default async function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await getProvider(Number(id));
  if (!provider) notFound();
  const reviews = await getProviderReviews(provider.id);

  const avg = (key: "quality" | "communication" | "professionalism" | "punctuality" | "value") =>
    reviews.length ? reviews.reduce((s, r) => s + r[key], 0) / reviews.length : 5;

  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex flex-wrap items-start gap-4">
              {provider.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={provider.logoUrl}
                  alt={`${provider.businessName} logo`}
                  className="h-16 w-16 rounded-3xl bg-white object-contain ring-1 ring-black/[0.08]"
                />
              ) : (
                <span
                  className="grid h-16 w-16 place-items-center rounded-3xl text-xl font-black text-white"
                  style={{ backgroundColor: provider.accent }}
                  aria-hidden
                >
                  {provider.businessName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">{provider.businessName}</h1>
                  <StatusPill status={provider.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <Stars value={num(provider.rating)} size="md" />
                  <span className="font-bold text-navy-800">{num(provider.rating).toFixed(1)}</span>
                  <span>({provider.reviewCount} reviews)</span>
                  <span aria-hidden>·</span>
                  <span>
                    {provider.suburb ? `${provider.suburb}, ` : ""}
                    {provider.city}, {provider.province}
                  </span>
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{provider.bio}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {provider.badges.map((b) => (
                <VerificationBadge key={b} id={b} />
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <Metric label="Jobs completed" value={String(provider.jobsCompleted)} />
              <Metric label="Response time" value={`${provider.responseMinutes} min`} />
              <Metric label="Success rate" value={`${provider.successRate}%`} />
              <Metric label="Experience" value={`${provider.yearsExperience} yrs`} />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-navy-800">Services offered</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {provider.categories.map((c) => (
                <Link key={c} href={`/services/${c}`} className="chip hover:bg-teal-50 hover:text-teal-700">
                  <span aria-hidden>{categoryIcon(c)}</span>
                  {categoryName(c)}
                </Link>
              ))}
            </div>

            <h2 className="mt-6 text-lg font-bold text-navy-800">Portfolio</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Before", "After", "On site", "Team"].map((label, i) => (
                <div
                  key={label}
                  className="grid aspect-square place-items-center rounded-2xl text-2xl"
                  style={{ background: i % 2 ? "#eef2f9" : "#e8faf8" }}
                >
                  <span aria-hidden>{["🧰", "✨", "🚧", "👷"][i]}</span>
                  <span className="mt-1 text-[11px] font-semibold text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-navy-800">Customer reviews ({reviews.length})</h2>
              <span className="text-xs text-slate-500">Only customers who accepted a quote can review</span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {(["quality", "communication", "professionalism", "punctuality", "value"] as const).map((k) => (
                <div key={k} className="rounded-2xl bg-mist p-3 text-center">
                  <p className="text-[11px] font-semibold capitalize text-slate-500">{k}</p>
                  <p className="mt-0.5 text-lg font-extrabold text-navy-800">{avg(k).toFixed(1)}</p>
                </div>
              ))}
            </div>

            <ul className="mt-5 space-y-4">
              {reviews.length === 0 ? (
                <li className="text-sm text-slate-500">No reviews yet — be the first to hire and rate this business.</li>
              ) : null}
              {reviews.map((r) => (
                <li key={r.id} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-sm font-bold text-navy-800">{r.author}</span>
                    <span className="text-xs text-slate-400">
                      {r.city} · {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.comment}</p>
                  {r.recommend ? <p className="mt-1 text-xs font-semibold text-good">👍 Would recommend</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Call-out from</p>
            <p className="mt-1 text-3xl font-extrabold text-navy-800">{zar(provider.hourlyRate)}<span className="text-base font-semibold text-slate-500">/hr</span></p>
            <Link href={`/post-job?category=${provider.categories[0] ?? "handyman"}`} className="btn btn-accent mt-4 w-full">
              Request a quote
            </Link>
            <button className="btn btn-ghost mt-2 w-full">💬 Message business</button>
            <button className="btn btn-ghost mt-2 w-full">⭐ Save to favourites</button>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-navy-800">Business details</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Owner" value={provider.ownerName} />
              <Row label="Service radius" value={`${provider.serviceRadiusKm} km`} />
              <Row label="Operating hours" value={provider.operatingHours} />
              <Row label="Emergency callouts" value={provider.emergencyAvailable ? "Yes, 24/7" : "Standard hours"} />
              <Row label="Team size" value={`${provider.employees} people`} />
              <Row label="Languages" value={provider.languages.join(", ")} />
              <Row label="Operating provinces" value={provider.provinces.join(", ")} />
              <Row label="Membership" value={provider.plan === "free" ? "Verified (Free)" : `${provider.plan} plan`} />
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-navy-800">Safety</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Keep payments and messages on LocalFix SA. If a provider asks for off-platform payment, report them.
            </p>
            <button className="btn btn-ghost mt-3 w-full !text-bad">🚩 Report this provider</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-navy-800">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-navy-800">{value}</dd>
    </div>
  );
}
