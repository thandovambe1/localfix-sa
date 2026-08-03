import Link from "next/link";
import type { Metadata } from "next";
import WithdrawalActions from "@/components/withdrawal-actions";
import { Stat } from "@/components/ui";
import { getWithdrawalStats, getWithdrawalsDetailed } from "@/lib/queries";
import { formatZAR, formatZARCompact } from "@/lib/commission";
import { num, shortDate, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Withdrawals", robots: { index: false } };

const FILTERS = [
  { key: "", label: "All" },
  { key: "requested", label: "🔔 Requested" },
  { key: "approved", label: "✅ Approved" },
  { key: "completed", label: "💸 Completed" },
  { key: "rejected", label: "❌ Rejected" },
];

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const [stats, rows] = await Promise.all([
    getWithdrawalStats(),
    getWithdrawalsDetailed(sp.status || undefined),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Customer withdrawals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Approve, release or reject wallet withdrawals. Funds are held on-platform until you release the EFT.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pending payouts" value={stats?.pending ?? 0} hint="Awaiting your action" />
        <Stat
          label="Held in escrow"
          value={formatZARCompact(num(stats?.pendingCents))}
          hint="Customer funds to release"
        />
        <Stat label="Released to date" value={stats?.completed ?? 0} hint={formatZARCompact(num(stats?.completedCents))} />
        <Stat label="Rejected" value={stats?.rejected ?? 0} hint="Refunded to wallet" />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Filter withdrawals">
        {FILTERS.map((f) => {
          const active = (sp.status ?? "") === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `/admin/withdrawals?status=${f.key}` : "/admin/withdrawals"}
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
            <p className="mt-3 text-sm font-semibold text-navy-800">Nothing to process here</p>
          </div>
        ) : null}

        {rows.map((w) => (
          <article key={w.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-navy-800">{w.reference}</span>
                  <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                    {w.status}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-navy-800">{w.customer?.name ?? "Unknown customer"}</p>
                <p className="text-xs text-slate-500">
                  {w.customer?.email ?? ""} · requested {timeAgo(w.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-navy-800">{formatZAR(w.amountCents)}</p>
                <p className="text-[11px] text-slate-500">amount requested</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <Cell label="Bank" value={w.bankName} />
              <Cell label="Holder" value={w.accountHolder} />
              <Cell label="Account" value={`••${w.accountNumber.slice(-4)}`} />
              <Cell label="Type / branch" value={`${w.accountType}${w.branchCode ? ` · ${w.branchCode}` : ""}`} />
            </div>

            {w.processedBy ? (
              <p className="mt-3 text-[11px] text-slate-400">
                Last actioned by {w.processedBy}
                {w.processedAt ? ` · ${shortDate(w.processedAt)}` : ""}
                {w.payoutReference ? ` · ref ${w.payoutReference}` : ""}
                {w.adminNotes ? ` · "${w.adminNotes}"` : ""}
              </p>
            ) : null}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <WithdrawalActions id={w.id} status={w.status} amountLabel={formatZAR(w.amountCents)} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-navy-800">{value}</p>
    </div>
  );
}
