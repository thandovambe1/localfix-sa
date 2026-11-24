import Link from "next/link";
import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  payments,
  providers,
  providerWalletTransactions,
  providerWithdrawals,
  walletTransactions,
  webhookEvents,
} from "@/db/schema";
import ProviderWithdrawalActions from "@/components/provider-withdrawal-actions";
import { Stat } from "@/components/ui";
import { formatZAR, formatZARCompact } from "@/lib/commission";
import { shortDate, timeAgo } from "@/lib/format";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wallet oversight", robots: { index: false } };

export default async function AdminWalletsPage() {
  await ready();
  const [customerLedger, providerLedger, jobPayments, customerAccounts, providerAccounts, webhookRows, providerWithdrawalRows] = await Promise.all([
    db.select().from(walletTransactions).orderBy(desc(walletTransactions.createdAt)).limit(100),
    db.select().from(providerWalletTransactions).orderBy(desc(providerWalletTransactions.createdAt)).limit(100),
    db.select().from(payments).orderBy(desc(payments.createdAt)).limit(50),
    db.select().from(customers),
    db.select().from(providers),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(30),
    db.select().from(providerWithdrawals).orderBy(desc(providerWithdrawals.createdAt)).limit(30),
  ]);

  const customerNames = new Map(customerAccounts.map((account) => [account.id, account.name]));
  const providerNames = new Map(providerAccounts.map((account) => [account.id, account.businessName]));
  const storedCustomerBalance = customerAccounts.reduce((sum, account) => sum + account.walletCents, 0);
  const storedProviderBalance = providerAccounts.reduce((sum, account) => sum + account.walletCents, 0);
  const customerLedgerBalance = customerLedger
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const providerLedgerBalance = providerLedger
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Wallet oversight & reconciliation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Balances are always read from PostgreSQL account rows and reconciled against completed ledger entries.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Customer wallet float" value={formatZARCompact(storedCustomerBalance)} hint={`Ledger ${formatZARCompact(customerLedgerBalance)}`} />
        <Stat label="Provider wallet float" value={formatZARCompact(storedProviderBalance)} hint={`Ledger ${formatZARCompact(providerLedgerBalance)}`} />
        <Stat label="Failed deposits" value={customerLedger.filter((i) => i.status === "failed").length + providerLedger.filter((i) => i.status === "failed").length} hint="Across wallet ledgers" />
        <Stat label="Webhook events" value={webhookRows.length} hint="Recent processed events" />
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/withdrawals" className="btn btn-ghost !px-4 !py-2 text-sm">Customer withdrawals</Link>
        <Link href="/admin/payments" className="btn btn-ghost !px-4 !py-2 text-sm">Job payments & payouts</Link>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-navy-800">Recent wallet ledger entries</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead><tr className="text-slate-500"><th className="pb-2">When</th><th>Owner</th><th>Account</th><th>Type</th><th>Reference</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {[
                ...customerLedger.map((item) => ({ ...item, owner: `Customer · ${customerNames.get(item.customerId) ?? item.customerId}`, createdAt: item.createdAt })),
                ...providerLedger.map((item) => ({ ...item, owner: `Provider · ${providerNames.get(item.providerId) ?? item.providerId}`, createdAt: item.createdAt })),
              ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 40).map((item) => (
                <tr key={`${item.owner}-${item.id}`} className="border-t border-slate-100">
                  <td className="py-2">{timeAgo(item.createdAt)}</td><td>{item.owner}</td><td>{item.type}</td><td className="font-mono">{item.reference}</td><td>{item.status}</td><td className="text-right font-bold">{formatZAR(Math.abs(item.amountCents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-navy-800">Provider withdrawal requests</h2>
        <ul className="mt-3 space-y-2">
          {providerWithdrawalRows.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-mist px-3 py-2 text-xs">
              <span className="min-w-0 flex-1"><strong className="block text-navy-800">{providerNames.get(w.providerId) ?? "Provider"}</strong>{w.reference} · {w.bankName} · ••••{w.accountNumber.slice(-4)} · {w.status}</span>
              <strong>{formatZAR(w.amountCents)}</strong>
              <ProviderWithdrawalActions withdrawalId={w.id} status={w.status} amount={formatZAR(w.amountCents)} />
            </li>
          ))}
          {!providerWithdrawalRows.length ? <li className="text-xs text-slate-500">No provider withdrawals yet.</li> : null}
        </ul>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-navy-800">Recent Yoco job payments</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {jobPayments.slice(0, 15).map((payment) => <li key={payment.id} className="flex justify-between gap-3 rounded-xl bg-mist px-3 py-2"><span>{payment.reference} · {payment.status}</span><strong>{formatZAR(payment.totalAmountCents)}</strong></li>)}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-bold text-navy-800">Recent webhook activity</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {webhookRows.map((event) => <li key={event.id} className="rounded-xl bg-mist px-3 py-2">{event.eventType} · {event.status} · {event.checkoutId ?? "no checkout"} · {shortDate(event.createdAt)}</li>)}
            {!webhookRows.length ? <li className="text-slate-500">No webhook events recorded yet.</li> : null}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">Pending deposits remain excluded from balances until a verified Yoco success event is processed.</p>
        </div>
      </section>
    </div>
  );
}
