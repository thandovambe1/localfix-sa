import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Countdown, JobChat, QuoteActions, QuoteDocButton } from "@/components/job-client";
import { CommissionBreakdown, PayButton, PaymentStatusBadge } from "@/components/payment-section";
import { QuoteComparePanel } from "@/components/quote-compare";
import { QuoteDocument } from "@/components/quote-document";
import { PayFromWalletButton } from "@/components/wallet-card";
import { StatusPill, Stars, VerificationBadge } from "@/components/ui";
import { getCustomerSession } from "@/lib/auth";
import {
  getCustomer,
  getJob,
  getJobBroadcasts,
  getJobMessages,
  getJobQuotes,
  getPaymentByJobId,
} from "@/lib/queries";
import { categoryIcon, categoryName, urgencyLabel } from "@/lib/services";
import { num, shortDate, timeAgo, zar } from "@/lib/format";
import { formatZAR } from "@/lib/commission";
import { getAdminSession } from "@/lib/auth";
import { aliasMapFor, isPaymentSettled, quoteRevealed } from "@/lib/reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Job details", robots: { index: false } };

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const jobId = Number(id);
  const job = await getJob(jobId);
  if (!job) notFound();

  const [quotes, messages, broadcastRows, payment] = await Promise.all([
    getJobQuotes(jobId),
    getJobMessages(jobId),
    getJobBroadcasts(jobId),
    getPaymentByJobId(jobId),
  ]);

  const best = quotes.length ? Math.min(...quotes.map((q) => q.amount)) : 0;
  const acceptedQuote = quotes.find((q) => q.status === "accepted");

  const session = await getCustomerSession();
  const customer = session ? await getCustomer(session.id) : null;
  const admin = await getAdminSession();
  const customerOwnsJob = Boolean(
    customer && (job.customerId === customer.id || job.customerEmail.toLowerCase() === customer.email.toLowerCase()),
  );

  // Identity is revealed only for the accepted quote, after payment clears.
  const settled = isPaymentSettled(payment);
  const aliases = aliasMapFor(quotes);
  const displayName = (q: (typeof quotes)[number]) =>
    admin || quoteRevealed(q, payment) ? (q.provider?.businessName ?? "Provider") : (aliases[q.id] ?? "Verified provider");
  const revealed = (q: (typeof quotes)[number]) => Boolean(admin) || quoteRevealed(q, payment);

  return (
    <div className="container-page py-8 md:py-12">
      {isNew ? (
        <div className="animate-fade-up mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-bold text-good">
            ✅ Job broadcast to {job.broadcastCount} verified professionals near {job.suburb || job.city}.
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            📧 A confirmation email has been sent to {job.customerEmail}. We&apos;ll also notify you by{" "}
            {job.contactMethod} the moment quotes arrive — most customers receive their first quote within 18 minutes.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={job.status} />
              <span className="chip">
                <span aria-hidden>{categoryIcon(job.categorySlug)}</span>
                {categoryName(job.categorySlug)}
              </span>
              <span className="chip !bg-amber-50 !text-amber-700">🚦 {urgencyLabel(job.urgency)}</span>
              <Countdown deadline={job.quoteDeadline ? job.quoteDeadline.toISOString() : null} />
              <span className="ml-auto text-xs font-semibold text-slate-400">{job.reference}</span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">{job.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Posted {timeAgo(job.createdAt)} · {job.suburb ? `${job.suburb}, ` : ""}
              {job.city}, {job.province}
            </p>

            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{job.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Info label="Budget" value={job.budgetMin || job.budgetMax ? `${zar(job.budgetMin)} – ${zar(job.budgetMax)}` : "Open to quotes"} />
              <Info label="Preferred times" value={job.preferredTimes || "Flexible"} />
              <Info label="Contact via" value={job.contactMethod} />
            </div>

            {job.photos.length ? (
              <div className="mt-5">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Photos &amp; videos</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.photos.map((p, i) => (
                    <span key={`${p}-${i}`} className="grid h-20 w-24 place-items-center rounded-2xl bg-mist text-2xl" title={p}>
                      {p.length <= 3 ? p : "🖼️"}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl bg-navy-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-700">🤖 AI job analysis</p>
              <p className="mt-1.5 text-sm text-navy-800">{job.aiSummary}</p>
              <p className="mt-1 text-xs text-navy-600">
                Complexity: <strong className="capitalize">{job.aiComplexity}</strong> · Fair range {zar(job.aiBudgetLow)} –{" "}
                {zar(job.aiBudgetHigh)}
              </p>
            </div>
          </section>

          {/* LIVE MAP */}
          <section className="card overflow-hidden">
            <div className="relative h-56 bg-[linear-gradient(120deg,#e7eef8,#dbeeec)]">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(27,59,111,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(27,59,111,0.12) 1px, transparent 1px)",
                  backgroundSize: "36px 36px",
                }}
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute -inset-8 rounded-full bg-teal-300/40 pulse-ring" />
                <span className="relative grid h-11 w-11 place-items-center rounded-full bg-navy-600 text-lg text-white shadow-lg">
                  📍
                </span>
              </div>
              <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-navy-700 backdrop-blur">
                {num(job.lat).toFixed(4)}, {num(job.lng).toFixed(4)} · {broadcastRows.length} pros in radius
              </div>
            </div>
          </section>

          {/* QUOTES */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-800">Received quotes ({quotes.length})</h2>
              {quotes.length > 1 ? <span className="text-xs text-slate-500">Sorted by newest · best price highlighted</span> : null}
            </div>
            <div className="space-y-3">
              {quotes.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-2xl">📡</div>
                  <p className="mt-3 text-sm font-semibold text-navy-800">Your job is live and broadcasting</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {job.broadcastCount} verified professionals have been notified. Quotes usually start arriving within
                    the hour.
                  </p>
                </div>
              ) : null}

              {quotes.map((q) => (
                <article key={q.id} className="card card-hover p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-black text-white"
                      style={{ backgroundColor: revealed(q) ? (q.provider?.accent ?? "#3f66ab") : "#94a3b8" }}
                      aria-hidden
                    >
                      {revealed(q) ? (q.provider?.businessName ?? "LF").slice(0, 2).toUpperCase() : (aliases[q.id] ?? "P").replace("Pro ", "")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {revealed(q) ? (
                          <Link href={`/providers/${q.providerId}`} className="text-[15px] font-bold text-navy-800 hover:text-teal-600">
                            {q.provider?.businessName ?? "Provider"}
                          </Link>
                        ) : (
                          <span className="text-[15px] font-bold text-navy-800">{aliases[q.id] ?? "Verified provider"}</span>
                        )}
                        {!revealed(q) ? (
                          <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-bold text-slate-500" title="Revealed after acceptance and payment">
                            🔒 anonymous
                          </span>
                        ) : null}
                        {q.amount === best && quotes.length > 1 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-good">
                            Best price
                          </span>
                        ) : null}
                        <StatusPill status={q.status} />
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Stars value={num(q.provider?.rating ?? 5)} />
                        <span>{num(q.provider?.rating ?? 5).toFixed(1)}</span>
                        <span>({q.provider?.reviewCount ?? 0} reviews)</span>
                        <span aria-hidden>·</span>
                        <span>{q.provider?.jobsCompleted ?? 0} jobs completed</span>
                        {revealed(q) ? (
                          <>
                            <span aria-hidden>·</span>
                            <span>{q.provider?.city}</span>
                          </>
                        ) : null}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">{q.message}</p>
                      {revealed(q) ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(q.provider?.badges ?? []).slice(0, 4).map((b) => (
                            <VerificationBadge key={b} id={b} />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-[11px] font-semibold text-teal-700">
                          ✓ Identity &amp; verification details revealed once you accept &amp; pay
                        </p>
                      )}
                      <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                        <div>
                          <dt className="font-semibold text-slate-500">Availability</dt>
                          <dd>{q.availability}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">Warranty</dt>
                          <dd>{q.warrantyMonths} months</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">Materials</dt>
                          <dd>{q.includesMaterials ? "Included" : "Excluded"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-2xl font-extrabold text-navy-800">{zar(q.amount)}</p>
                      <QuoteDocButton>
                        <QuoteDocument
                          quote={q}
                          provider={q.provider}
                          anonymous={!revealed(q)}
                          alias={aliases[q.id]}
                          job={{
                            reference: job.reference,
                            title: job.title,
                            categorySlug: job.categorySlug,
                            customerName: job.customerName,
                            suburb: job.suburb,
                            city: job.city,
                            province: job.province,
                          }}
                          validUntil={job.quoteDeadline}
                        />
                      </QuoteDocButton>
                      <p className="text-[11px] text-slate-500">
                        Platform fee: {formatZAR(Math.round(q.amount * 100 * 0.13))} (13%)
                      </p>
                      <p className="text-[11px] text-slate-400">Quoted {timeAgo(q.createdAt)}</p>
                      {q.status === "submitted" && customerOwnsJob ? (
                        <QuoteActions quoteId={q.id} />
                      ) : q.status === "submitted" ? (
                        <span className="rounded-full bg-mist px-3 py-1 text-[11px] font-bold text-slate-500">
                          Awaiting customer decision
                        </span>
                      ) : q.status === "accepted" && !payment && customerOwnsJob ? (
                        <PayButton quoteId={q.id} quoteAmount={q.amount} jobId={job.id} />
                      ) : q.status === "accepted" && !payment ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                          Awaiting customer payment
                        </span>
                      ) : q.status === "accepted" && payment ? (
                        <PaymentStatusBadge status={payment.status} />
                      ) : (
                        <StatusPill status={q.status} />
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {quotes.length >= 2 ? (
              <div className="mt-6">
                <QuoteComparePanel quotes={quotes} job={job} anonymous={!settled && !admin} aliases={aliases} />
              </div>
            ) : null}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-5">
          {/* PAYMENT & COMMISSION BREAKDOWN */}
          {acceptedQuote ? (
            <div className="space-y-3">
              <CommissionBreakdown
                quoteAmount={acceptedQuote.amount}
                providerName={
                  admin || quoteRevealed(acceptedQuote, payment)
                    ? (acceptedQuote.provider?.businessName ?? "Provider")
                    : (aliases[acceptedQuote.id] ?? "Your provider")
                }
              />
              {payment ? (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-navy-800">Payment status</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Status</span>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Reference</span>
                      <span className="font-mono text-xs font-semibold text-navy-800">{payment.reference}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Provider payout</span>
                      <span className="font-semibold text-good">{formatZAR(payment.providerPayoutCents)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Payout status</span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        {payment.payoutStatus === "completed" ? "✅ Settled" : "⏳ Pending"}
                      </span>
                    </div>
                    {payment.paidAt ? (
                      <p className="text-xs text-slate-400">Paid on {shortDate(payment.paidAt)}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-navy-800">Ready to pay</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Pay securely to confirm the booking. The provider will be notified immediately.
                  </p>
                  <div className="mt-4 space-y-3">
                    {customer ? (
                      <>
                        <PayFromWalletButton
                          quoteId={acceptedQuote.id}
                          totalCents={Math.round(acceptedQuote.amount * 100)}
                          balanceCents={customer.walletCents}
                          jobId={job.id}
                        />
                        <div className="flex items-center gap-3">
                          <span className="h-px flex-1 bg-slate-100" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">or</span>
                          <span className="h-px flex-1 bg-slate-100" />
                        </div>
                      </>
                    ) : null}
                    <PayButton
                      quoteId={acceptedQuote.id}
                      quoteAmount={acceptedQuote.amount}
                      jobId={job.id}
                    />
                    {!customer ? (
                      <p className="text-center text-[11px] text-slate-500">
                        <Link href="/login" className="font-semibold text-teal-700 hover:underline">
                          Sign in
                        </Link>{" "}
                        to pay from your wallet.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* REVEALED PROVIDER CONTACT — only after acceptance + payment */}
          {acceptedQuote && settled && acceptedQuote.provider ? (
            <div className="card border-teal-200 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">✅ Your provider</p>
              <div className="mt-3 flex items-center gap-3">
                {acceptedQuote.provider.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={acceptedQuote.provider.logoUrl}
                    alt={`${acceptedQuote.provider.businessName} logo`}
                    className="h-12 w-12 rounded-2xl bg-white object-contain ring-1 ring-black/[0.06]"
                  />
                ) : (
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-black text-white"
                    style={{ backgroundColor: acceptedQuote.provider.accent }}
                    aria-hidden
                  >
                    {acceptedQuote.provider.businessName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-navy-800">{acceptedQuote.provider.businessName}</p>
                  <p className="text-xs text-slate-500">{acceptedQuote.provider.ownerName}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <a href={`tel:${acceptedQuote.provider.phone}`} className="btn btn-ghost !py-2.5 text-sm">
                  📞 {acceptedQuote.provider.phone}
                </a>
                {acceptedQuote.provider.whatsapp ? (
                  <a
                    href={`https://wa.me/27${acceptedQuote.provider.whatsapp.replace(/\D/g, "").replace(/^0/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost !py-2.5 text-sm"
                  >
                    💬 WhatsApp {acceptedQuote.provider.whatsapp}
                  </a>
                ) : null}
                <a href={`mailto:${acceptedQuote.provider.email}`} className="btn btn-ghost !py-2.5 text-sm">
                  ✉️ Email provider
                </a>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Identity released after payment. Keep all agreements and extra work on-platform for protection.
              </p>
            </div>
          ) : null}

          {/* CHAT — locked until payment clears to protect identities */}
          {settled ? (
            <JobChat
              jobId={job.id}
              initial={messages.map((m) => ({
                id: m.id,
                sender: m.sender,
                authorName: m.authorName,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
              }))}
              authorName={job.customerName}
            />
          ) : (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-navy-800">💬 Secure chat</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Messaging opens once you accept a quote and payment clears. This keeps every agreement on-platform
                and protects both sides.
              </p>
              <p className="mt-2 text-[11px] font-semibold text-teal-700">
                Providers can answer questions inside their quote message.
              </p>
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Broadcast log</h3>
            <p className="mt-1 text-xs text-slate-500">Providers notified for this job (identities protected)</p>
            <ul className="mt-3 space-y-3">
              {broadcastRows.length === 0 ? <li className="text-xs text-slate-500">No providers matched yet.</li> : null}
              {broadcastRows.map((b, i) => (
                <li key={b.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy-800">
                      {admin ? b.provider?.businessName : `Verified pro #${i + 1}`}
                    </span>
                    <span className="text-slate-500">
                      {num(b.distanceKm)} km · match {b.matchScore}% · {b.channels.join(", ")}
                    </span>
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-good">sent</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-800">Actions</h3>
            <div className="mt-3 grid gap-2">
              <button className="btn btn-ghost !py-2.5 text-sm" disabled={!settled} title={settled ? "" : "Available after payment"}>
                📞 Voice call provider{settled ? "" : " 🔒"}
              </button>
              <button className="btn btn-ghost !py-2.5 text-sm" disabled={!settled} title={settled ? "" : "Available after payment"}>
                🎥 Video call{settled ? "" : " 🔒"}
              </button>
              <Link href="/dashboard/customer" className="btn btn-ghost !py-2.5 text-sm">
                🗂️ Back to my dashboard
              </Link>
              <button className="btn btn-ghost !py-2.5 text-sm !text-bad">🚩 Report a problem</button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Job created {shortDate(job.createdAt)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-navy-800">{value}</p>
    </div>
  );
}
