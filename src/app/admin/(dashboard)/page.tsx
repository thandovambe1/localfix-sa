import Link from "next/link";
import type { Metadata } from "next";
import { PaymentStatusBadge } from "@/components/payment-section";
import { Stat, StatusPill } from "@/components/ui";
import {
  getAuditLogs,
  getCustomerStats,
  getJobsDetailed,
  getPaymentStats,
  getPaymentsDetailed,
  getProviders,
  getStats,
  getWithdrawalStats,
} from "@/lib/queries";
import { categoryIcon, categoryName, urgencyLabel } from "@/lib/services";
import { num, timeAgo, zar } from "@/lib/format";
import { COMMISSION_PERCENT, formatZAR, formatZARCompact } from "@/lib/commission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin overview", robots: { index: false } };

export default async function AdminOverviewPage() {
  const [stats, payStats, custStats, wdStats, providers, jobs, payments, logs] = await Promise.all([
    getStats(),
    getPaymentStats(),
    getCustomerStats(),
    getWithdrawalStats(),
    getProviders({ limit: 100 }),
    getJobsDetailed(),
    getPaymentsDetailed(),
    getAuditLogs(8),
  ]);

  const pendingProviders = providers.filter((p) => p.status === "pending");
  const payoutQueue = payments.filter((p) => p.payoutStatus === "requested" || p.payoutStatus === "processing");
  const openJobs = jobs.filter((j) => j.status === "open");
  const stuckJobs = openJobs.filter((j) => j.quoteCount === 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Operations overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live snapshot of requests, money and network health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">📊 {new Date().getFullYear()} production</span>
        </div>
      </header>

      {/* ACTION QUEUE */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          href="/admin/payments?payoutStatus=requested"
          icon="🔔"
          count={payoutQueue.length}
          label="Payout requests"
          hint={`${formatZARCompact(num(payStats?.pendingPayoutsCents))} awaiting release`}
          tone={payoutQueue.length > 0 ? "amber" : "calm"}
        />
        <ActionCard
          href="/admin/withdrawals?status=requested"
          icon="💸"
          count={wdStats?.pending ?? 0}
          label="Wallet withdrawals"
          hint={`${formatZARCompact(num(wdStats?.pendingCents))} held in escrow`}
          tone={(wdStats?.pending ?? 0) > 0 ? "amber" : "calm"}
        />
        <ActionCard
          href="/admin/providers"
          icon="✅"
          count={pendingProviders.length}
          label="Provider approvals"
          hint="Documents to verify"
          tone={pendingProviders.length > 0 ? "teal" : "calm"}
        />
        <ActionCard
          href="/admin/requests?status=open"
          icon="⚠️"
          count={stuckJobs.length}
          label="Requests with no quotes"
          hint="May need manual dispatch"
          tone={stuckJobs.length > 0 ? "red" : "calm"}
        />
      </section>

      {/* MONEY */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Revenue · {COMMISSION_PERCENT}% platform commission
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Commission earned"
            value={formatZARCompact(num(payStats?.totalCommissionCents))}
            hint="Retained by LocalFix SA"
          />
          <Stat
            label="Gross volume"
            value={formatZARCompact(num(payStats?.totalRevenueCents))}
            hint={`${payStats?.paidPayments ?? 0} cleared payments`}
          />
          <Stat
            label="Released to providers"
            value={formatZARCompact(num(payStats?.releasedCents))}
            hint={`${payStats?.completedPayouts ?? 0} settled`}
          />
          <Stat
            label="Awaiting release"
            value={formatZARCompact(num(payStats?.pendingPayoutsCents))}
            hint="Owed to providers"
          />
        </div>
      </section>

      {/* NETWORK */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Network</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Providers" value={stats?.providerCount ?? 0} hint={`${stats?.activeProviders ?? 0} active`} />
          <Stat label="Job requests" value={stats?.jobCount ?? 0} hint={`${openJobs.length} open`} />
          <Stat label="Quotes" value={stats?.quoteCount ?? 0} hint={`Pipeline ${zar(num(stats?.quoteValue), { compact: true })}`} />
          <Stat label="Avg rating" value={`${num(stats?.avgRating, 5).toFixed(2)} ★`} hint={`${stats?.reviewCount ?? 0} reviews`} />
        </div>
      </section>

      {/* CUSTOMERS */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Registered customers</h2>
          <Link href="/admin/customers" className="text-xs font-semibold text-teal-600 hover:underline">
            View all profiles →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Registered profiles"
            value={custStats?.totalCustomers ?? 0}
            hint={`${custStats?.activeCustomers ?? 0} active`}
          />
          <Stat label="New (30 days)" value={custStats?.newThisMonth ?? 0} hint="Sign-ups this month" />
          <Stat
            label="Wallet float"
            value={formatZARCompact(num(custStats?.walletFloatCents))}
            hint="Customer money held"
          />
          <Stat label="Funded wallets" value={custStats?.fundedWallets ?? 0} hint="With a positive balance" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* PAYOUT QUEUE */}
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-navy-800">Payout queue</h2>
            <Link href="/admin/payments" className="text-xs font-semibold text-teal-600 hover:underline">
              Open payments console →
            </Link>
          </div>

          {payoutQueue.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-mist p-5 text-sm text-slate-600">
              🎉 Nothing waiting. Every requested payout has been released.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {payoutQueue.slice(0, 6).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-navy-800">{p.reference}</span>
                      <PaymentStatusBadge status={p.payoutStatus} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {p.provider?.businessName ?? "Unknown provider"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Requested {timeAgo(p.payoutRequestedAt ?? p.paidAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-good">{formatZAR(p.providerPayoutCents)}</p>
                    <p className="text-[11px] text-slate-500">fee {formatZAR(p.commissionCents)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* AUDIT LOG */}
        <section className="card p-6">
          <h2 className="text-lg font-bold text-navy-800">Audit log</h2>
          <p className="mt-1 text-xs text-slate-500">Every privileged action, immutably recorded.</p>
          <ul className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <li className="text-sm text-slate-500">No admin activity recorded yet.</li>
            ) : null}
            {logs.map((log) => (
              <li key={log.id} className="border-l-2 border-teal-200 pl-3">
                <p className="text-xs font-bold text-navy-800">{log.action}</p>
                <p className="text-xs text-slate-600">{log.detail}</p>
                <p className="text-[11px] text-slate-400">
                  {log.actor} · {timeAgo(log.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* RECENT REQUESTS */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy-800">Latest job requests</h2>
          <Link href="/admin/requests" className="text-xs font-semibold text-teal-600 hover:underline">
            View all requests →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="pb-2">Ref</th>
                <th className="pb-2">Request</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Urgency</th>
                <th className="pb-2">Quotes</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 8).map((j) => (
                <tr key={j.id} className="border-t border-slate-100">
                  <td className="py-2.5">
                    <Link href={`/jobs/${j.id}`} className="font-mono text-xs font-semibold text-navy-800 hover:text-teal-600">
                      {j.reference}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate py-2.5 text-slate-700">{j.title}</td>
                  <td className="py-2.5 text-slate-600">
                    <span aria-hidden>{categoryIcon(j.categorySlug)}</span> {categoryName(j.categorySlug)}
                  </td>
                  <td className="py-2.5 text-slate-600">{urgencyLabel(j.urgency)}</td>
                  <td className="py-2.5 font-semibold text-navy-800">{j.quoteCount}</td>
                  <td className="py-2.5">
                    <StatusPill status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  count,
  label,
  hint,
  tone,
}: {
  href: string;
  icon: string;
  count: number;
  label: string;
  hint: string;
  tone: "amber" | "teal" | "red" | "calm";
}) {
  const tones: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50",
    teal: "border-teal-200 bg-teal-50",
    red: "border-red-200 bg-red-50",
    calm: "border-slate-100 bg-white",
  };
  return (
    <Link href={href} className={`card card-hover border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="text-3xl font-extrabold text-navy-800">{count}</span>
      </div>
      <p className="mt-3 text-sm font-bold text-navy-800">{label}</p>
      <p className="text-xs text-slate-600">{hint}</p>
    </Link>
  );
}
