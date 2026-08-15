import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  CompletionForm,
  CorrectionForm,
  JobCardDocumentActions,
  SignaturePanel,
} from "@/components/job-card-actions";
import BrandLogo from "@/components/brand-logo";
import { StatusPill } from "@/components/ui";
import { authorizeJobCard, CUSTOMER_CONFIRMATION, getJobCardBundle, PROVIDER_CONFIRMATION } from "@/lib/job-cards";
import { ready } from "@/lib/queries";
import { categoryName } from "@/lib/services";
import { formatZAR } from "@/lib/commission";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Digital Job Card", robots: { index: false, follow: false } };

function dateTime(value: Date | null | undefined) {
  return value
    ? value.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" })
    : "Not signed";
}

export default async function JobCardPage({ params }: { params: Promise<{ jobId: string }> }) {
  await ready();
  const { jobId: raw } = await params;
  const jobId = Number(raw);
  const bundle = await getJobCardBundle(jobId);
  if (!bundle) redirect("/dashboard/customer");

  const actor = await authorizeJobCard(bundle.job, bundle.card);
  if (!actor) redirect(actor === null ? "/login" : "/");

  const { job, quote, provider, customer, payment, card, providerSignature, customerSignature, corrections } = bundle;
  const paid = Boolean(payment && ["paid", "paid_out"].includes(payment.status));
  const providerCanComplete = actor.role === "provider" && quote?.providerId === actor.id && paid;
  const providerCanSign = providerCanComplete && card?.status === "awaiting_provider_signature" && !providerSignature;
  const customerCanSign =
    actor.role === "customer" &&
    card?.customerId === actor.id &&
    card.status === "awaiting_customer_signature" &&
    Boolean(providerSignature) &&
    !customerSignature;
  const completed = Boolean(card?.locked && providerSignature && customerSignature && job.status === "completed");

  return (
    <div className="container-page py-8 md:py-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={actor.role === "provider" ? "/dashboard/provider" : actor.role === "admin" ? "/admin/requests" : "/dashboard/customer"}
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <JobCardDocumentActions jobId={jobId} canDownload={completed} />
      </div>

      <article className="overflow-hidden rounded-[1.8rem] border border-black/[0.06] bg-white shadow-[var(--shadow-lift)] print:rounded-none print:border-0 print:shadow-none">
        <div className="h-1.5 bg-gradient-to-r from-[#0c2f5f] to-[#0f9c96]" />
        <div className="p-5 sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <BrandLogo size="md" showTagline={false} />
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Digital Job Card</p>
              <p className="mt-1 font-mono text-sm font-bold text-navy-800">{card?.documentReference ?? `Draft · ${job.reference}`}</p>
              <p className="mt-1 text-xs text-slate-500">Job Reference: {job.reference}</p>
              {card ? <StatusPill status={card.status} /> : <StatusPill status={job.status} />}
            </div>
          </header>

          {!card && actor.role !== "provider" ? (
            <div className="mt-8 rounded-2xl bg-mist p-8 text-center">
              <span className="text-3xl" aria-hidden>🧰</span>
              <h2 className="mt-3 text-lg font-extrabold text-navy-800">Job Card not started yet</h2>
              <p className="mt-1 text-sm text-slate-600">The accepted provider will create the Job Card after the work is performed.</p>
            </div>
          ) : null}

          {!paid && actor.role === "provider" ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Payment must clear through the existing LocalFix payment flow before this Job Card can be completed.
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Section title="Customer Details">
              <Detail label="Customer" value={job.customerName} />
              <Detail label="Service address" value={`${job.address}, ${job.suburb}, ${job.city}, ${job.province}`} />
              <Detail label="Contact" value={`${job.customerEmail} · ${job.customerPhone}`} />
            </Section>
            <Section title="Service Details">
              <Detail label="Category" value={categoryName(job.categorySlug)} />
              <Detail label="Provider" value={provider?.businessName ?? "—"} />
              <Detail label="Date" value={shortDate(card?.providerSubmittedAt ?? job.createdAt)} />
            </Section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Section title="Original Job Description">
              <p className="text-sm leading-relaxed text-slate-700">{job.description}</p>
            </Section>
            <Section title="Accepted Quotation">
              <Detail label="Quote" value={quote ? formatZAR(quote.amount * 100) : "—"} />
              <Detail label="Final agreed amount" value={card ? formatZAR(card.finalAmountCents) : quote ? formatZAR(quote.amount * 100) : "—"} />
              <Detail label="Payment" value={payment?.status ?? "Not recorded"} />
            </Section>
          </div>

          {card ? (
            <>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Section title="Work Completed"><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{card.workCompleted}</p></Section>
                <Section title="Materials / Notes">
                  <Detail label="Materials used" value={card.materialsUsed || "None recorded"} />
                  <Detail label="Additional notes" value={card.additionalNotes || "None"} />
                </Section>
              </div>

              {card.completionPhotos.length ? (
                <Section title="Completion Photos" className="mt-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {card.completionPhotos.map((photo, i) => (
                      <div key={`${photo.slice(-18)}-${i}`} className="aspect-[4/3] overflow-hidden rounded-2xl bg-mist">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`Completion photo ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Electronic Signatures" className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SignatureDisplay title="Service Provider" signature={providerSignature} />
                  <SignatureDisplay title="Customer" signature={customerSignature} />
                </div>
              </Section>

              <Section title="Final Status" className="mt-6">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Check label="Provider signed" checked={Boolean(providerSignature)} />
                  <Check label="Customer signed" checked={Boolean(customerSignature)} />
                  <Check label="Job completed" checked={completed} />
                </div>
                {card.integrityHash ? (
                  <div className="mt-4 rounded-xl bg-mist px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">SHA-256 integrity identifier</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-navy-700">{card.integrityHash}</p>
                  </div>
                ) : null}
              </Section>

              {corrections.length ? (
                <Section title="Administrative Correction Notes (Signed Record Unchanged)" className="mt-6">
                  <ul className="space-y-2">
                    {corrections.map((c) => (
                      <li key={c.id} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <strong>{dateTime(c.createdAt)} · {c.createdBy}</strong>
                        <p className="mt-1">{c.note}</p>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
            </>
          ) : null}
        </div>
      </article>

      <div className="mt-6 space-y-6 print:hidden">
        {providerCanComplete && !providerSignature ? (
          <CompletionForm
            jobId={jobId}
            initial={card ? { workCompleted: card.workCompleted, materialsUsed: card.materialsUsed, additionalNotes: card.additionalNotes, completionPhotos: card.completionPhotos } : null}
          />
        ) : null}
        {providerCanSign ? (
          <SignaturePanel jobId={jobId} role="provider" defaultName={provider?.ownerName ?? actor.name} confirmationText={PROVIDER_CONFIRMATION} />
        ) : null}
        {card?.status === "awaiting_customer_signature" && actor.role === "provider" ? (
          <div className="card p-6 text-center"><span className="text-3xl" aria-hidden>⏳</span><h2 className="mt-3 text-lg font-extrabold text-navy-800">Awaiting Customer Signature</h2><p className="mt-1 text-sm text-slate-600">The customer has been notified by inbox and email.</p></div>
        ) : null}
        {customerCanSign ? (
          <SignaturePanel jobId={jobId} role="customer" defaultName={customer?.name ?? actor.name} confirmationText={CUSTOMER_CONFIRMATION} />
        ) : null}
        {actor.role === "customer" && card?.status === "awaiting_provider_signature" ? (
          <div className="card p-6 text-center"><h2 className="text-lg font-extrabold text-navy-800">Awaiting Provider Signature</h2><p className="mt-1 text-sm text-slate-600">The provider is reviewing and signing the completion information.</p></div>
        ) : null}
        {completed ? (
          <div className="card border-teal-200 bg-teal-50 p-6 text-center"><span className="text-3xl" aria-hidden>✅</span><h2 className="mt-2 text-lg font-extrabold text-navy-800">Signed Job Card Locked</h2><p className="mt-1 text-sm text-slate-600">Both independent electronic signatures are stored. Normal users cannot alter this record.</p></div>
        ) : null}
        {actor.role === "admin" && completed ? <CorrectionForm jobId={jobId} /> : null}
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-500 print:mt-8">
        Electronic Signature record · LocalFix SA · This interface does not claim a regulated advanced electronic signature.
      </p>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-100 p-5 ${className}`}><h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">{title}</h2>{children}</section>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 last:mb-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-navy-800">{value}</p></div>;
}
function Check({ label, checked }: { label: string; checked: boolean }) {
  return <div className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${checked ? "bg-emerald-50 text-good" : "bg-slate-100 text-slate-400"}`}>{checked ? "✓" : "○"} {label}</div>;
}
function SignatureDisplay({ title, signature }: { title: string; signature: { signatureData: string; signerName: string; signedAt: Date; confirmationText: string } | null }) {
  return <div className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold text-navy-800">{title}</p>{signature ? <><div className="mt-2 h-24 overflow-hidden rounded-xl bg-white p-2 ring-1 ring-black/[0.05]"><img src={signature.signatureData} alt={`${title} electronic signature`} className="h-full w-full object-contain" /></div><p className="mt-2 text-sm font-bold text-navy-800">{signature.signerName}</p><p className="text-[11px] text-slate-500">Signed {dateTime(signature.signedAt)}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">{signature.confirmationText}</p></> : <p className="mt-3 text-sm text-slate-400">Not signed</p>}</div>;
}
