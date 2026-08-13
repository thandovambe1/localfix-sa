import Link from "next/link";
import type { Metadata } from "next";
import ProviderOpsEditor from "@/components/provider-ops-editor";
import ProviderDocumentReview from "@/components/provider-document-review";
import { Stat, StatusPill, VerificationBadge } from "@/components/ui";
import { getProviders } from "@/lib/queries";
import { categoryName } from "@/lib/services";
import { num, timeAgo } from "@/lib/format";

const PLAN_LABEL: Record<string, string> = { free: "Starter · free", pro: "Pro", premium: "Premium" };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Provider verification", robots: { index: false } };

export default async function AdminProvidersPage() {
  const providers = await getProviders({ limit: 100 });
  const pending = providers.filter((p) => p.status === "pending");
  const active = providers.filter((p) => p.status === "active");

  const ordered = [...pending, ...providers.filter((p) => p.status !== "pending")];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Provider verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Approve, re-review or suspend businesses. Only active providers receive job broadcasts.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total providers" value={providers.length} hint="On the platform" />
        <Stat label="Awaiting approval" value={pending.length} hint="Needs document review" />
        <Stat label="Active" value={active.length} hint="Receiving leads" />
      </section>

      <section className="space-y-3">
        {ordered.map((p) => (
          <article key={p.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black text-white"
                style={{ backgroundColor: p.accent }}
                aria-hidden
              >
                {p.businessName.slice(0, 2).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/providers/${p.id}`} className="text-sm font-bold text-navy-800 hover:text-teal-600">
                    {p.businessName}
                  </Link>
                  <StatusPill status={p.status} />
                  <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-bold text-navy-700">
                    {PLAN_LABEL[p.plan] ?? p.plan}
                  </span>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                    {p.provinces.length} province{p.provinces.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] text-slate-400">★ {num(p.rating).toFixed(1)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {p.ownerName} · {p.city}, {p.province} · {p.serviceRadiusKm} km radius · joined {timeAgo(p.createdAt)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {p.categories.map(categoryName).join(", ")} · {p.provinces.join(", ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.badges.slice(0, 5).map((b) => (
                    <VerificationBadge key={b} id={b} />
                  ))}
                </div>
              </div>

              <Link href={`/admin/applications/${p.id}`} className="btn btn-accent !px-4 !py-2 text-xs">
                📂 Review full application
              </Link>
            </div>

            <details className="group mt-4">
              <summary className="cursor-pointer list-none text-xs font-bold text-teal-700 hover:underline">
                ▸ Quick compliance, plan &amp; coverage
              </summary>
              <ProviderDocumentReview providerId={p.id} />
              <ProviderOpsEditor provider={{ id: p.id, businessName: p.businessName, plan: p.plan, provinces: p.provinces }} />
              <div className="mt-3">
                <Link href={`/admin/applications/${p.id}`} className="btn btn-ghost !px-4 !py-2 text-xs">
                  Open full application with downloads &amp; decision →
                </Link>
              </div>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
