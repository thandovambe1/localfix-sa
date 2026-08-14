import Link from "next/link";
import type { Metadata } from "next";
import { StatusPill, Stat } from "@/components/ui";
import AdminRequestActions from "@/components/admin-request-actions";
import { getJobsDetailed } from "@/lib/queries";
import { categoryIcon, categoryName, urgencyLabel } from "@/lib/services";
import { shortDate, timeAgo, zar } from "@/lib/format";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Job requests", robots: { index: false } };

const FILTERS = [
  { key: "", label: "All requests" },
  { key: "open", label: "🟢 Open" },
  { key: "quoted", label: "💬 Quoted" },
  { key: "accepted", label: "🤝 Accepted" },
  { key: "payment_pending", label: "⏳ Awaiting payment" },
  { key: "in_progress", label: "🔧 In progress" },
  { key: "completed", label: "✅ Completed" },
];

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const jobs = await getJobsDetailed({ status: sp.status || undefined });
  const all = await getJobsDetailed();
  const session = await getAdminSession();
  const isUltimateControl = session && (session.role === "owner" || session.role === "admin");

  const emergencies = all.filter((j) => j.urgency === "emergency" && j.status === "open").length;
  const unquoted = all.filter((j) => j.quoteCount === 0 && j.status === "open").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Job requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every customer request dispatched through the network, with live quote activity.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total requests" value={all.length} hint="All time" />
        <Stat label="Open" value={all.filter((j) => j.status === "open").length} hint="Awaiting quotes" />
        <Stat label="Emergencies" value={emergencies} hint="Open & urgent" />
        <Stat label="No quotes yet" value={unquoted} hint="May need manual dispatch" />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Filter requests">
        {FILTERS.map((f) => {
          const active = (sp.status ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `/admin/requests?status=${f.key}` : "/admin/requests"}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                active ? "bg-navy-600 text-white" : "bg-mist text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-3">
        {jobs.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-3xl" aria-hidden>
              🗂️
            </p>
            <p className="mt-3 text-sm font-semibold text-navy-800">No requests in this view</p>
            <p className="mt-1 text-sm text-slate-600">Try a different filter.</p>
          </div>
        ) : null}

        {jobs.map((j) => (
          <article key={j.id} className="card card-hover p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">{j.reference}</span>
                  <StatusPill status={j.status} />
                  <span className="chip">
                    <span aria-hidden>{categoryIcon(j.categorySlug)}</span>
                    {categoryName(j.categorySlug)}
                  </span>
                  {j.urgency === "emergency" ? (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-bad">
                      🚨 Emergency
                    </span>
                  ) : (
                    <span className="chip !bg-amber-50 !text-amber-700">{urgencyLabel(j.urgency)}</span>
                  )}
                </div>

                <h2 className="mt-2 text-base font-bold text-navy-800">
                  <Link href={`/jobs/${j.id}`} className="hover:text-teal-600">
                    {j.title}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{j.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {j.customerName} · {j.suburb ? `${j.suburb}, ` : ""}
                  {j.city}, {j.province} · posted {timeAgo(j.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-navy-800">
                  {j.budgetMin || j.budgetMax ? `${zar(j.budgetMin)} – ${zar(j.budgetMax)}` : "Open budget"}
                </p>
                <p className="text-[11px] text-slate-500">customer budget</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <Cell label="Broadcast to" value={`${j.broadcastCount} pros`} />
              <Cell label="Quotes" value={String(j.quoteCount)} highlight={j.quoteCount > 0} />
              <Cell label="Best quote" value={j.bestQuote ? zar(j.bestQuote) : "—"} />
              <Cell label="Quote deadline" value={j.quoteDeadline ? shortDate(j.quoteDeadline) : "—"} />
            </div>

             <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
              <div className="flex flex-wrap gap-2">
                <Link href={`/jobs/${j.id}`} className="btn btn-ghost !px-4 !py-2 text-xs">
                  View full request
                </Link>
                {j.quoteCount === 0 && j.status === "open" ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
                    ⚠️ Needs attention — no quotes received
                  </span>
                ) : null}
              </div>
              {isUltimateControl ? (
                <div className="flex items-center gap-2">
                  <AdminRequestActions jobId={j.id} reference={j.reference} />
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${highlight ? "bg-teal-50" : "bg-mist"}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${highlight ? "text-teal-700" : "text-navy-800"}`}>{value}</p>
    </div>
  );
}
