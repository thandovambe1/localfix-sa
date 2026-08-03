import { Monogram } from "@/components/brand-logo";
import { Stars } from "@/components/ui";
import { COMMISSION_PERCENT } from "@/lib/commission";
import { num, shortDate, zar } from "@/lib/format";
import { categoryIcon, categoryName } from "@/lib/services";

/** Lean view models so both the job page and the inbox can feed the document. */
export type QuoteDocQuote = {
  id: number;
  amount: number;
  message: string;
  availability: string;
  warrantyMonths: number;
  includesMaterials: boolean;
  createdAt: Date | string;
};
export type QuoteDocProvider = {
  businessName: string;
  ownerName?: string | null;
  rating: string | number;
  reviewCount: number;
  city: string;
  badges: string[];
  accent: string;
  logoUrl?: string | null;
} | null;
export type QuoteDocJob = {
  reference: string;
  title: string;
  categorySlug: string;
  customerName: string;
  suburb?: string | null;
  city: string;
  province: string;
};

const NAVY = "#0c2f5f";
const TEAL = "#0f9c96";

export function quoteReference(quoteId: number) {
  return `Q-${String(100000 + quoteId * 7)}`;
}

/**
 * The official LocalFix SA quote document. Providers quote on this
 * template; their own name and uploaded logo brand the sheet.
 */
export function QuoteDocument({
  quote,
  provider,
  job,
  validUntil,
  anonymous = false,
  alias,
}: {
  quote: QuoteDocQuote;
  provider: QuoteDocProvider;
  job: QuoteDocJob;
  validUntil?: Date | null;
  /** When true, hide the provider's identity — required before payment clears. */
  anonymous?: boolean;
  alias?: string;
}) {
  const displayName = anonymous ? (alias ?? "Verified local provider") : (provider?.businessName ?? "Service provider");
  const commissionCents = Math.round(quote.amount * 100 * (COMMISSION_PERCENT / 100));
  const providerCents = quote.amount * 100 - commissionCents;

  return (
    <div className="relative overflow-hidden rounded-[1.4rem] border border-black/[0.07] bg-white shadow-[var(--shadow-lift)]">
      {/* Brand strip */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY}, ${TEAL})` }} />

      {/* Watermark monogram */}
      <div className="pointer-events-none absolute -right-10 top-24 opacity-[0.04]" aria-hidden>
        <Monogram className="h-72 w-72" />
      </div>

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Monogram className="h-10 w-10" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-400">LocalFix SA</p>
              <p className="text-lg font-black tracking-tight" style={{ color: NAVY }}>
                Official Quote
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold" style={{ color: NAVY }}>
              {quoteReference(quote.id)}
            </p>
            <p className="text-xs text-slate-500">Issued {shortDate(quote.createdAt)}</p>
            {validUntil ? <p className="text-xs text-slate-500">Valid until {shortDate(validUntil)}</p> : null}
          </div>
        </header>

        <div className="my-6 h-px bg-slate-100" />

        {/* Provider identity */}
        <section className="grid gap-5 sm:grid-cols-[1.3fr_1fr]">
          <div className="flex items-start gap-4">
            {anonymous || !provider?.logoUrl ? (
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mist ring-1 ring-black/[0.05]"
                aria-hidden
              >
                <Monogram className="h-9 w-9" />
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.logoUrl}
                alt={`${provider.businessName} logo`}
                className="h-16 w-16 shrink-0 rounded-2xl object-contain ring-1 ring-black/[0.06]"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Quoted by</p>
              <p className="truncate text-[17px] font-extrabold" style={{ color: NAVY }}>
                {anonymous ? displayName : (provider?.businessName ?? "Service provider")}
              </p>
              {anonymous ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  🔒 Identity revealed after you accept &amp; payment clears
                </p>
              ) : provider ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <Stars value={num(provider.rating)} />
                  <span className="font-bold" style={{ color: NAVY }}>
                    {num(provider.rating).toFixed(1)}
                  </span>
                  <span>({provider.reviewCount})</span>
                  <span aria-hidden>·</span>
                  <span>{provider.city}</span>
                </p>
              ) : null}
              {!anonymous && provider?.badges.length ? (
                <p className="mt-1.5 text-[11px] font-semibold" style={{ color: TEAL }}>
                  ✓ {provider.badges.length} verification checks passed
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-mist p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Prepared for</p>
            <p className="mt-1 text-sm font-bold" style={{ color: NAVY }}>
              {job.customerName}
            </p>
            <p className="text-xs text-slate-500">
              {job.suburb ? `${job.suburb}, ` : ""}
              {job.city}, {job.province}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span aria-hidden>{categoryIcon(job.categorySlug)}</span>
              {categoryName(job.categorySlug)} · {job.reference}
            </p>
          </div>
        </section>

        {/* Scope */}
        <section className="mt-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Scope of work</p>
          <p className="mt-1.5 text-sm font-bold" style={{ color: NAVY }}>
            {job.title}
          </p>
          {quote.message ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{quote.message}</p>
          ) : null}
        </section>

        {/* Cost table */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">Labour &amp; workmanship</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>
                  {quote.includesMaterials ? "Included" : "Excluded"}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">Materials</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>
                  {quote.includesMaterials ? "Included" : "Quoted separately"}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">Workmanship warranty</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>
                  {quote.warrantyMonths} months
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">Earliest availability</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: TEAL }}>
                  {quote.availability}
                </td>
              </tr>
              <tr className="border-b border-slate-100 bg-mist/60">
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  Includes {COMMISSION_PERCENT}% LocalFix platform protection (disputes, insurance checks, secure payments)
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-slate-500">{zar(commissionCents / 100)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide" style={{ color: NAVY }}>
                  Total payable
                </td>
                <td className="px-4 py-3.5 text-right text-xl font-black" style={{ color: NAVY }}>
                  {zar(quote.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-sm text-[11px] leading-relaxed text-slate-400">
            This quote is issued on the LocalFix SA standard template. Provider net payout {zar(providerCents / 100)}{" "}
            after platform fee. Accepting creates a protected agreement with in-platform payments and dispute
            resolution.
          </p>
          <div className="text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Authorised by</p>
            <p className="mt-0.5 text-sm font-bold" style={{ color: NAVY }}>
              {anonymous ? "Verified professional" : (provider?.ownerName ?? "—")}
            </p>
            <p className="text-[11px] text-slate-500">
              {anonymous ? "LocalFix SA verified network" : (provider?.businessName ?? "")}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
