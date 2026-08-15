import Link from "next/link";
import type { Metadata } from "next";
import { ProviderCard, Stat, StatusPill } from "@/components/ui";
import { WalletCard, WalletHistory, WithdrawalHistory } from "@/components/wallet-card";
import {
  getCustomer,
  getInboxMessages,
  getJobsForCustomer,
  getProviders,
  getWalletTransactions,
  getWithdrawalsForCustomer,
} from "@/lib/queries";
import { getCustomerSession } from "@/lib/auth";
import { categoryIcon, categoryName, urgencyLabel } from "@/lib/services";
import { shortDate, timeAgo, zar } from "@/lib/format";
import { formatZAR } from "@/lib/commission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My dashboard", robots: { index: false } };

export default async function CustomerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; topup?: string }>;
}) {
  const sp = await searchParams;
  const session = await getCustomerSession();

  // ── Signed out: invite them to log in or register ──
  if (!session) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <span className="text-4xl" aria-hidden>
            🔐
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy-800">Sign in to your dashboard</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Track your jobs, compare quotes, manage saved professionals and load your rainy-day wallet.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login?next=/dashboard/customer" className="btn btn-accent">
              Log in
            </Link>
            <Link href="/register" className="btn btn-ghost">
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const customer = await getCustomer(session.id);
  if (!customer) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <h1 className="text-xl font-extrabold text-navy-800">Account not found</h1>
          <Link href="/login" className="btn btn-accent mt-5">
            Sign in again
          </Link>
        </div>
      </div>
    );
  }

  const [myJobs, transactions, saved, inbox, wdRows] = await Promise.all([
    getJobsForCustomer(customer.id, customer.email),
    getWalletTransactions(customer.id),
    getProviders({ limit: 3 }),
    getInboxMessages(customer.id, customer.email),
    getWithdrawalsForCustomer(customer.id),
  ]);
  const inboxUnread = inbox.filter((m) => !m.read).length;

  const active = myJobs.filter((j) => j.status !== "completed");
  const completed = myJobs.filter((j) => j.status === "completed");
  const quotesReceived = myJobs.reduce((s, j) => s + j.quoteCount, 0);

  return (
    <div className="container-page py-8 md:py-12">
      {sp.welcome ? (
        <div className="animate-fade-up mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-bold text-good">🎉 Welcome to LocalFix SA, {customer.name.split(" ")[0]}!</p>
          <p className="mt-1 text-xs text-emerald-800">
            Your profile is ready. Post your first job, or load your wallet so you&apos;re covered for a rainy day.
          </p>
        </div>
      ) : null}

      {sp.topup === "success" ? (
        <div className="animate-fade-up mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-bold text-good">✅ Wallet topped up successfully.</p>
        </div>
      ) : null}
      {sp.topup === "cancelled" ? (
        <div className="animate-fade-up mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-700">Top-up cancelled — no money was taken.</p>
        </div>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
            Hello, {customer.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {customer.suburb ? `${customer.suburb}, ` : ""}
            {customer.city} · member since {shortDate(customer.createdAt)}
          </p>
        </div>
        <Link href="/post-job" className="btn btn-accent">
          + New job request
        </Link>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Wallet balance" value={formatZAR(customer.walletCents)} hint="Ready to spend" />
        <Stat label="Active jobs" value={active.length} hint="Open, quoted or in progress" />
        <Stat label="Quotes received" value={quotesReceived} hint="Across all jobs" />
        <Stat label="Completed" value={completed.length} hint="Rate them to help others" />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-bold text-navy-800">Active jobs</h2>
            <div className="mt-4 space-y-3">
              {active.length === 0 ? (
                <div className="card p-6 text-sm text-slate-600">
                  No active jobs yet.{" "}
                  <Link href="/post-job" className="font-semibold text-teal-700 hover:underline">
                    Post one
                  </Link>{" "}
                  and get quotes in minutes.
                </div>
              ) : null}
              {active.map((j) => {
                const cardAction = j.status === "awaiting_customer_signature" || j.status === "awaiting_provider_signature";
                const href = cardAction ? `/job-cards/${j.id}` : `/jobs/${j.id}`;
                return (
                  <article key={j.id} className={`card card-hover p-5 ${j.status === "awaiting_customer_signature" ? "ring-2 ring-teal-300" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip">
                        <span aria-hidden>{categoryIcon(j.categorySlug)}</span>
                        {categoryName(j.categorySlug)}
                      </span>
                      <StatusPill status={j.status} />
                      <span className="chip !bg-amber-50 !text-amber-700">{urgencyLabel(j.urgency)}</span>
                      <span className="ml-auto text-xs text-slate-400">{timeAgo(j.createdAt)}</span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-navy-800">{j.title}</h3>
                    <p className="text-xs text-slate-500">
                      {j.reference} · {j.suburb || j.city} · {j.broadcastCount} pros notified
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-bold text-teal-700">{j.quoteCount} quotes received</span>
                      <span className="text-slate-500">
                        Budget {j.budgetMin || j.budgetMax ? `${zar(j.budgetMin)} – ${zar(j.budgetMax)}` : "open"}
                      </span>
                    </p>
                    <div className="mt-4">
                      <Link href={href} className={`btn !px-4 !py-2 text-sm ${j.status === "awaiting_customer_signature" ? "btn-accent" : "btn-ghost"}`}>
                        {j.status === "awaiting_customer_signature"
                          ? "Action Required — Sign Job Card"
                          : j.status === "awaiting_provider_signature"
                            ? "View Job Card — Provider Signing"
                            : "View Job"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {completed.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-navy-800">Completed jobs</h2>
              <div className="mt-4 space-y-3">
                {completed.map((j) => (
                  <article key={j.id} className="card card-hover flex flex-wrap items-center gap-3 p-5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-navy-800">{j.title}</span>
                      <span className="text-xs text-slate-500">
                        {j.reference} · {shortDate(j.createdAt)}
                      </span>
                    </span>
                    <StatusPill status={j.status} />
                    <Link href={j.jobCard ? `/job-cards/${j.id}` : `/jobs/${j.id}`} className="btn btn-ghost !px-4 !py-2 text-sm">
                      {j.jobCard ? "View Job Card" : "View Historical Job"}
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card p-6">
            <h2 className="text-lg font-bold text-navy-800">Payments &amp; invoices</h2>
            {myJobs.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No invoices yet.</p>
            ) : (
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Reference</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Budget</th>
                    <th className="pb-2 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {myJobs.slice(0, 5).map((j) => (
                    <tr key={j.id} className="border-t border-slate-100">
                      <td className="py-2.5 font-semibold text-navy-800">{j.reference}</td>
                      <td className="py-2.5">{shortDate(j.createdAt)}</td>
                      <td className="py-2.5">{zar(j.budgetMax ?? j.aiBudgetLow)}</td>
                      <td className="py-2.5 text-right">
                        <button className="text-xs font-semibold text-teal-600 hover:underline">Download PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Pay by wallet, card, instant EFT, PayFast, Ozow or Yoco. Deposits and milestone payments supported.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-800">Saved professionals</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-navy-800">📬 Inbox</h3>
              {inboxUnread > 0 ? (
                <span className="rounded-full bg-bad px-2 py-0.5 text-[10px] font-black text-white">
                  {inboxUnread} new
                </span>
              ) : null}
            </div>
            {inbox.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                Quotes from verified professionals will land here automatically.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {inbox.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-start gap-2.5">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.read ? "bg-slate-200" : "bg-teal-500"}`}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${m.read ? "font-medium text-slate-600" : "font-bold text-navy-800"}`}>
                        {m.title}
                      </span>
                      <span className="block text-[11px] text-slate-400">{timeAgo(m.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/inbox" className="btn btn-ghost mt-4 w-full !py-2.5 text-sm">
              Open inbox
            </Link>
          </div>

          <WalletCard balanceCents={customer.walletCents} />

          <WithdrawalHistory
            withdrawals={wdRows.map((w) => ({
              id: w.id,
              reference: w.reference,
              amountCents: w.amountCents,
              bankName: w.bankName,
              accountNumber: w.accountNumber,
              status: w.status,
              payoutReference: w.payoutReference,
              createdAt: w.createdAt.toISOString(),
              processedAt: w.processedAt ? w.processedAt.toISOString() : null,
              adminNotes: w.adminNotes,
            }))}
          />

          <WalletHistory
            transactions={transactions.map((t) => ({
              id: t.id,
              type: t.type,
              amountCents: t.amountCents,
              balanceAfterCents: t.balanceAfterCents,
              description: t.description,
              reference: t.reference,
              status: t.status,
              createdAt: t.createdAt.toISOString(),
            }))}
          />

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">My profile</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Name", customer.name],
                ["Email", customer.email],
                ["Mobile", customer.phone || "—"],
                ["Contact via", customer.contactMethod],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="truncate text-right font-semibold text-navy-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">My properties</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2">
                <span aria-hidden>🏠</span>
                {customer.address || customer.suburb || customer.city}
              </li>
            </ul>
            <button className="btn btn-ghost mt-3 w-full !py-2.5 text-sm">+ Add property</button>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Loyalty &amp; referrals</h3>
            <p className="mt-2 text-sm text-slate-600">
              Share your code and both you and your friend get R150 credited to your wallets.
            </p>
            <p className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-center text-sm font-black tracking-widest text-teal-700">
              LFX-FRIEND150
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
