import Link from "next/link";
import type { Metadata } from "next";
import PayoutActions from "@/components/payout-actions";
import { PaymentStatusBadge } from "@/components/payment-section";
import { Stat } from "@/components/ui";
import { getPaymentStats, getPaymentsDetailed } from "@/lib/queries";
import { getAdminSession, canProcessPayouts } from "@/lib/auth";
import { COMMISSION_PERCENT, formatZAR, formatZARCompact } from "@/lib/commission";
import { num, shortDate, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments & payouts", robots: { index: false } };

const FILTERS = [
  { key: "", label: "All payments" },
  { key: "requested", label: "🔔 Payout requests" },
  { key: "processing", label: "⚙️ Approved" },
  { key: "payout_pending", label: "⏳ Awaiting request" },
  { key: "completed", label: "✅ Settled" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ payoutStatus?: string }>;
}) {
  const sp = await searchParams;
  const session = await getAdminSession();
  const [stats, rows] = await Promise.all([
    getPaymentStats(),
    getPaymentsDetailed({ payoutStatus: sp.payoutStatus || undefined }),
  ]);

  const allowed = canProcessPayouts(session?.role ?? "");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Payments &amp; payouts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Customers pay in full via Yoco. LocalFix SA retains {COMMISSION_PERCENT}% and you release the remaining{" "}
          {100 - COMMISSION_PERCENT}% to the provider.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Platform commission"
          value={formatZARCompact(num(stats?.totalCommissionCents))}
          hint={`${COMMISSION_PERCENT}% of cleared payments`}
        />
        <Stat
          label="Awaiting release"
          value={formatZARCompact(num(stats?.pendingPayoutsCents))}
          hint={`${stats?.requestedCount ?? 0} requested · ${stats?.processingCount ?? 0} approved`}
        />
        <Stat
          label="Released to providers"
          value={formatZARCompact(num(stats?.releasedCents))}
          hint={`${stats?.completedPayouts ?? 0} payouts settled`}
        />
        <Stat
          label="Gross volume"
          value={formatZARCompact(num(stats?.totalRevenueCents))}
          hint={`${stats?.paidPayments ?? 0} cleared payments`}
        />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Filter payouts">
        {FILTERS.map((f) => {
          const active = (sp.payoutStatus ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `/admin/payments?payoutStatus=${f.key}` : "/admin/payments"}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                active ? "bg-teal-600 text-white" : "bg-mist text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-3">
        {rows.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-3xl" aria-hidden>
              💸
            </p>
            <p className="mt-3 text-sm font-semibold text-navy-800">No payments in this view</p>
            <p className="mt-1 text-sm text-slate-600">Try a different filter.</p>
          </div>
        ) : null}

        {rows.map((p) => (
          <article key={p.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-navy-800">{p.reference}</span>
                  <PaymentStatusBadge status={p.status} />
                  {p.payoutStatus === "requested" ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      🔔 Payout requested {timeAgo(p.payoutRequestedAt)}
                    </span>
                  ) : null}
                  {p.payoutStatus === "processing" ? (
                    <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-bold text-navy-700">
                      ⚙️ Approved — ready to release
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {p.job ? (
                    <Link href={`/jobs/${p.job.id}`} className="font-semibold text-navy-800 hover:text-teal-600">
                      {p.job.title}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Job removed</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {p.provider ? (
                    <Link href={`/providers/${p.provider.id}`} className="hover:text-teal-600">
                      {p.provider.businessName}
                    </Link>
                  ) : (
                    "Unknown provider"
                  )}
                  {p.job ? ` · ${p.job.city}` : ""} · created {shortDate(p.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-extrabold text-navy-800">{formatZAR(p.totalAmountCents)}</p>
                <p className="text-[11px] text-slate-500">customer paid</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-teal-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">
                  Platform fee ({COMMISSION_PERCENT}%)
                </p>
                <p className="mt-0.5 text-base font-extrabold text-teal-700">{formatZAR(p.commissionCents)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-good">Provider payout</p>
                <p className="mt-0.5 text-base font-extrabold text-good">{formatZAR(p.providerPayoutCents)}</p>
              </div>
              <div className="rounded-2xl bg-mist p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Payout status</p>
                <p className="mt-0.5 text-sm font-bold capitalize text-navy-800">
                  {p.payoutStatus.replace(/_/g, " ")}
                </p>
                {p.payoutReference ? (
                  <p className="text-[11px] text-slate-500">Ref {p.payoutReference}</p>
                ) : null}
              </div>
            </div>

            {p.processedBy ? (
              <p className="mt-3 text-[11px] text-slate-400">
                Last actioned by {p.processedBy}
                {p.payoutAt ? ` · released ${shortDate(p.payoutAt)}` : ""}
              </p>
            ) : null}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <PayoutActions
                paymentId={p.id}
                payoutStatus={p.payoutStatus}
                paymentStatus={p.status}
                payoutAmount={formatZAR(p.providerPayoutCents)}
                canProcess={allowed}
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
