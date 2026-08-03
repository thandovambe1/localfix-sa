import Link from "next/link";
import type { Metadata } from "next";
import { Stat, StatusPill } from "@/components/ui";
import { getCustomerStats, getCustomersDetailed } from "@/lib/queries";
import { categoryIcon, categoryName } from "@/lib/services";
import { num, shortDate, timeAgo } from "@/lib/format";
import { formatZAR, formatZARCompact } from "@/lib/commission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Registered customers", robots: { index: false } };

export default async function AdminCustomersPage() {
  const [stats, customers] = await Promise.all([getCustomerStats(), getCustomersDetailed()]);

  const totalJobs = customers.reduce((s, c) => s + c.jobCount, 0);
  const totalSpend = customers.reduce((s, c) => s + c.spentCents, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Registered customers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every profile on the platform, the jobs they&apos;ve requested and what they hold in their wallets.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Registered profiles" value={stats?.totalCustomers ?? 0} hint={`${stats?.activeCustomers ?? 0} active`} />
        <Stat label="New (30 days)" value={stats?.newThisMonth ?? 0} hint="Sign-ups this month" />
        <Stat
          label="Wallet float"
          value={formatZARCompact(num(stats?.walletFloatCents))}
          hint={`${stats?.fundedWallets ?? 0} funded wallets`}
        />
        <Stat label="Jobs requested" value={totalJobs} hint="By registered customers" />
        <Stat label="Customer spend" value={formatZARCompact(totalSpend)} hint="Cleared payments" />
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-navy-800">Wallet liability</h2>
          <span className="chip !bg-teal-50 !text-teal-700">
            {formatZAR(num(stats?.walletFloatCents))} held on behalf of customers
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Pre-loaded wallet funds are customer money held by the platform until they approve a quote. Keep this
          reconciled against your Yoco settlement account.
        </p>
      </section>

      <section className="space-y-3">
        {customers.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-3xl" aria-hidden>
              👥
            </p>
            <p className="mt-3 text-sm font-semibold text-navy-800">No customers registered yet</p>
          </div>
        ) : null}

        {customers.map((c) => (
          <article key={c.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy-600 text-xs font-black text-white">
                  {c.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-navy-800">{c.name}</h2>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.suburb ? `${c.suburb}, ` : ""}
                    {c.city}, {c.province} · joined {shortDate(c.createdAt)}
                    {c.lastLoginAt ? ` · last seen ${timeAgo(c.lastLoginAt)}` : ""}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Wallet</p>
                <p className={`text-xl font-extrabold ${c.walletCents > 0 ? "text-teal-700" : "text-slate-400"}`}>
                  {formatZAR(c.walletCents)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <Cell label="Jobs requested" value={String(c.jobCount)} highlight={c.jobCount > 0} />
              <Cell label="Open / quoted" value={String(c.openJobs)} />
              <Cell label="Completed" value={String(c.completedJobs)} />
              <Cell label="Total spend" value={formatZAR(c.spentCents)} />
            </div>

            {c.jobs.length > 0 ? (
              <details className="group mt-4">
                <summary className="cursor-pointer list-none text-xs font-bold text-teal-700 hover:underline">
                  View {c.jobs.length} job request{c.jobs.length === 1 ? "" : "s"} ▾
                </summary>
                <ul className="mt-3 space-y-2">
                  {c.jobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 px-3 py-2.5"
                    >
                      <span className="font-mono text-[11px] font-bold text-slate-400">{j.reference}</span>
                      <Link href={`/jobs/${j.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-800 hover:text-teal-600">
                        {j.title}
                      </Link>
                      <span className="chip">
                        <span aria-hidden>{categoryIcon(j.categorySlug)}</span>
                        {categoryName(j.categorySlug)}
                      </span>
                      <StatusPill status={j.status} />
                      <span className="text-[11px] text-slate-400">{timeAgo(j.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="mt-3 text-xs italic text-slate-400">No jobs requested yet.</p>
            )}
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
