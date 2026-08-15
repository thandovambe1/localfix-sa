import Link from "next/link";
import type { Metadata } from "next";
import { QuoteForm } from "@/components/job-client";
import { PaymentStatusBadge } from "@/components/payment-section";
import ProviderSignOut from "@/components/provider-sign-out";
import RequestPayout from "@/components/request-payout";
import { Stat, StatusPill, VerificationBadge, Stars } from "@/components/ui";
import { getProvider, getProviderPipeline, getProviderReviews, getPaymentsByProvider } from "@/lib/queries";
import { getProviderSession } from "@/lib/auth";
import { categoryIcon, categoryName, urgencyLabel } from "@/lib/services";
import { num, timeAgo, zar } from "@/lib/format";
import { COMMISSION_PERCENT, formatZAR, formatZARCompact } from "@/lib/commission";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Provider dashboard", robots: { index: false } };

export default async function ProviderDashboard() {
  const session = await getProviderSession();
  if (!session) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <span className="text-4xl" aria-hidden>🔐</span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy-800">Provider login required</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Sign in with your registered business email to view leads, submit quotes and manage payouts.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/provider/login" className="btn btn-accent">
              Provider login
            </Link>
            <Link href="/become-a-provider" className="btn btn-ghost">
              Register business
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const provider = await getProvider(session.id);
  if (!provider) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <h1 className="text-xl font-extrabold text-navy-800">Provider profile not found</h1>
          <Link href="/provider/login" className="btn btn-accent mt-5">Sign in again</Link>
        </div>
      </div>
    );
  }

  const [pipeline, reviews, providerPayments] = await Promise.all([
    getProviderPipeline(provider.id),
    getProviderReviews(provider.id),
    getPaymentsByProvider(provider.id),
  ]);
  const earnings = pipeline.all
    .filter((e) => e.quote?.status === "accepted")
    .reduce((s, e) => s + (e.quote?.amount ?? 0), 0);
  const totalPayoutCents = providerPayments
    .filter((p) => p.status === "paid" || p.status === "paid_out")
    .reduce((s, p) => s + p.providerPayoutCents, 0);
  const pendingPayoutCents = providerPayments
    .filter((p) => p.payoutStatus === "payout_pending")
    .reduce((s, p) => s + p.providerPayoutCents, 0);

  return (
    <div className="container-page py-8 md:py-12">
      <header className="flex flex-wrap items-center gap-4">
        <span
          className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-black text-white"
          style={{ backgroundColor: provider.accent }}
          aria-hidden
        >
          {provider.businessName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">{provider.businessName}</h1>
          <p className="text-sm text-slate-500">
            {provider.city}, {provider.province} · {provider.serviceRadiusKm} km radius · {provider.plan} plan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/provider/forgot-password" className="btn btn-ghost !px-4 !py-2 text-sm">
            Change password
          </Link>
          <ProviderSignOut />
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.badges.map((b) => (
          <VerificationBadge key={b} id={b} />
        ))}
      </div>

      {/* Application progress — mirrors the latest Founder/Admin decision, emailed to you too */}
      {provider.status !== "active" ? (
        <div
          className={`mt-5 rounded-2xl border p-5 ${
            provider.status === "declined"
              ? "border-red-200 bg-red-50"
              : provider.status === "suspended"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="text-sm font-extrabold text-navy-800">
            {provider.status === "pending"
              ? "📋 Application under review"
              : provider.status === "declined"
                ? "🚫 Application declined"
                : "⛔ Account suspended"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {provider.status === "pending"
              ? "Our Trust & Safety team is checking your documents. You'll be emailed the moment a decision is made."
              : provider.status === "declined"
                ? "We're unable to approve your application right now. See the note below or contact support."
                : "Your account is currently suspended. Contact support for details."}
          </p>
          {provider.applicationNote ? (
            <p className="mt-3 rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-700">
              <span className="font-bold text-navy-800">Note from our team:</span> {provider.applicationNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pipeline value" value={zar(earnings)} hint="Accepted quotes" />
        <Stat label="Incoming leads" value={pipeline.incoming.length} hint="Awaiting your quote" />
        <Stat label="Response rate" value={`${provider.successRate}%`} hint={`Avg ${provider.responseMinutes} min`} />
        <Stat label="Rating" value={`${num(provider.rating).toFixed(1)} ★`} hint={`${provider.reviewCount} reviews`} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-bold text-navy-800">Incoming jobs ({pipeline.incoming.length})</h2>
            <p className="text-sm text-slate-500">Broadcast to you because they match your trades and radius.</p>
            <div className="mt-4 space-y-3">
              {pipeline.incoming.length === 0 ? (
                <div className="card p-6 text-sm text-slate-600">
                  No open leads right now. Keep your availability and radius up to date to receive more.
                </div>
              ) : null}
              {pipeline.incoming.map(({ job }) => (
                <article key={job.id} className="card card-hover p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">
                      <span aria-hidden>{categoryIcon(job.categorySlug)}</span>
                      {categoryName(job.categorySlug)}
                    </span>
                    <span className="chip !bg-amber-50 !text-amber-700">{urgencyLabel(job.urgency)}</span>
                    <span className="ml-auto text-xs text-slate-400">{timeAgo(job.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-navy-800">{job.title}</h3>
                  <p className="text-xs text-slate-500">
                    {job.suburb || job.city}, {job.province} · Budget{" "}
                    {job.budgetMin || job.budgetMax ? `${zar(job.budgetMin)} – ${zar(job.budgetMax)}` : "open"}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.description}</p>
                  <QuoteForm jobId={job.id} providerId={provider.id} />
                  <Link href={`/jobs/${job.id}`} className="mt-2 inline-block text-xs font-semibold text-teal-600 hover:underline">
                    View full job details →
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-800">Quoted &amp; accepted</h2>
            <div className="mt-4 space-y-3">
              {[...pipeline.quoted, ...pipeline.accepted].length === 0 ? (
                <div className="card p-6 text-sm text-slate-600">No quotes submitted yet.</div>
              ) : null}
              {[...pipeline.quoted, ...pipeline.accepted].map(({ job, quote }) => {
                const accepted = quote?.status === "accepted";
                const action =
                  job.status === "awaiting_provider_signature"
                    ? { label: "Sign Job Card", href: `/job-cards/${job.id}`, accent: true }
                    : job.status === "awaiting_customer_signature"
                      ? { label: "Awaiting Customer Signature", href: `/job-cards/${job.id}`, accent: false }
                      : accepted && ["accepted", "in_progress"].includes(job.status)
                        ? { label: "Complete Job", href: `/job-cards/${job.id}`, accent: true }
                        : { label: "Open", href: `/jobs/${job.id}`, accent: false };
                return (
                  <article key={job.id} className="card flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-navy-800">{job.title}</h3>
                        <StatusPill status={accepted ? job.status : quote?.status ?? job.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {job.city} · quoted {timeAgo(quote?.createdAt)} · {quote?.availability}
                      </p>
                    </div>
                    <p className="text-lg font-extrabold text-navy-800">{zar(quote?.amount ?? 0)}</p>
                    <Link
                      href={action.href}
                      className={`btn !px-4 !py-2 text-sm ${action.accent ? "btn-accent" : "btn-ghost"}`}
                    >
                      {action.label}
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>

          {pipeline.completed.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-navy-800">Completed jobs</h2>
              <div className="mt-4 space-y-3">
                {pipeline.completed.map(({ job, quote }) => (
                  <article key={job.id} className="card flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-navy-800">{job.title}</h3>
                        <StatusPill status="completed" />
                      </div>
                      <p className="text-xs text-slate-500">{job.reference} · {job.city}</p>
                    </div>
                    <p className="text-lg font-extrabold text-navy-800">{zar(quote?.amount ?? 0)}</p>
                    <Link href={`/job-cards/${job.id}`} className="btn btn-ghost !px-4 !py-2 text-sm">
                      View Signed Job Card
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card p-6">
            <h2 className="text-lg font-bold text-navy-800">Business analytics</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Earnings (30d)", zar(earnings)],
                ["Avg quote time", `${provider.responseMinutes} min`],
                ["Success rate", `${provider.successRate}%`],
                ["Customer satisfaction", `${num(provider.rating).toFixed(1)}/5`],
                ["Repeat customers", `${Math.round(provider.jobsCompleted * 0.28)}`],
                ["Jobs completed", String(provider.jobsCompleted)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-mist p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-extrabold text-navy-800">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Calendar</h3>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px]">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={`${d}-${i}`} className="font-bold text-slate-400">
                  {d}
                </span>
              ))}
              {Array.from({ length: 28 }).map((_, i) => {
                const today = i + 1 === new Date().getDate();
                return (
                  <span
                    key={i}
                    className={`grid aspect-square place-items-center rounded-lg ${
                      today ? "bg-navy-600 font-bold text-white" : "bg-mist text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {pipeline.incoming.length === 0
                ? "No leads yet — keep your profile active to receive jobs."
                : `${pipeline.incoming.length} lead${pipeline.incoming.length === 1 ? "" : "s"} awaiting your quote`}
            </p>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">💰 Earnings &amp; payouts</h3>
            <p className="mt-1 text-xs text-slate-500">
              You receive {100 - COMMISSION_PERCENT}% of each job. LocalFix retains {COMMISSION_PERCENT}%.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-good">Earned</p>
                <p className="mt-0.5 text-base font-extrabold text-good">{formatZARCompact(totalPayoutCents)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Awaiting payout</p>
                <p className="mt-0.5 text-base font-extrabold text-amber-700">
                  {formatZARCompact(pendingPayoutCents)}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {providerPayments.length === 0 ? (
                <li className="text-xs text-slate-500">No payments yet.</li>
              ) : null}
              {providerPayments.slice(0, 5).map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-navy-800">{p.reference}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Job total {formatZAR(p.totalAmountCents)} · fee {formatZAR(p.commissionCents)}
                  </p>
                  <p className="text-sm font-extrabold text-good">{formatZAR(p.providerPayoutCents)} to you</p>
                  {p.status === "paid" || p.status === "paid_out" ? (
                    <div className="mt-2">
                      <RequestPayout
                        paymentId={p.id}
                        amount={formatZAR(p.providerPayoutCents)}
                        payoutStatus={p.payoutStatus}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Invoices</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {pipeline.all.slice(0, 4).map(({ job, quote }) => (
                <li key={job.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-600">{job.reference}</span>
                  <span className="font-semibold text-navy-800">{zar(quote?.amount ?? job.aiBudgetLow)}</span>
                  <button className="text-xs font-semibold text-teal-600 hover:underline">PDF</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Latest reviews</h3>
            <ul className="mt-3 space-y-3">
              {reviews.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs font-bold text-navy-800">{r.author}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.comment}</p>
                </li>
              ))}
              {reviews.length === 0 ? <li className="text-xs text-slate-500">No reviews yet.</li> : null}
            </ul>
          </div>

          <div className="card border-teal-200 bg-gradient-to-br from-navy-50 via-white to-teal-50 p-5">
            <h3 className="text-sm font-bold text-navy-800">Grow faster</h3>
            <p className="mt-2 text-sm text-slate-600">
              Premium providers appear first in matching and unlock unlimited quotes, analytics and priority support.
            </p>
            <Link href="/pricing" className="btn btn-accent mt-4 w-full">
              Upgrade plan
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
