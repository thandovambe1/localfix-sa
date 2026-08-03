import type { Job } from "@/db/schema";
import { compareQuotes, type QuoteWithProvider } from "@/lib/compare";
import { formatZAR } from "@/lib/commission";
import { num } from "@/lib/format";

/**
 * The automated quoting agent's verdict panel: ranks every quote across
 * price, distance, availability, reputation and coverage.
 */
export function QuoteComparePanel({
  quotes,
  job,
  anonymous = false,
  aliases = {},
}: {
  quotes: QuoteWithProvider[];
  job: Job;
  /** Hide provider identities (required until payment clears). */
  anonymous?: boolean;
  aliases?: Record<number, string>;
}) {
  if (quotes.length < 2) return null;

  const result = compareQuotes(quotes, job, { anonymous, aliases });
  const nameOf = (q: { id: number; provider: { businessName: string } | null }) =>
    anonymous ? (aliases[q.id] ?? "Verified provider") : (q.provider?.businessName ?? "Provider");
  const bar = (score: number) => {
    const hue = score >= 75 ? "bg-teal-500" : score >= 50 ? "bg-warn" : "bg-bad";
    return (
      <span className="inline-block h-1.5 rounded-full align-middle" aria-hidden>
        <span className={`block h-1.5 rounded-full ${hue}`} style={{ width: `${Math.max(8, score)}px` }} />
      </span>
    );
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-navy-50 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-600 text-lg text-white shadow-sm" aria-hidden>
          🤖
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold tracking-tight text-navy-800">
            Quoting Agent comparison
          </h3>
          <p className="text-xs text-slate-500">
            Auto-ranked by price (35%), distance (20%), availability (20%), reputation (15%) and coverage (10%)
          </p>
        </div>
        <span className="chip !bg-white shadow-sm">{result.quotes.length} quotes analysed</span>
      </div>

      <div className="p-5">
        <p className="rounded-2xl bg-mist px-4 py-3 text-sm leading-relaxed text-slate-700">
          <span className="font-bold text-navy-800">Agent verdict: </span>
          {result.summary}
        </p>

        <div className="mt-4 space-y-3">
          {result.quotes.map((cq) => {
            const isBest = cq.rank === 1;
            return (
              <div
                key={cq.quote.id}
                className={`rounded-2xl border p-4 transition ${
                  isBest ? "border-teal-300 bg-teal-50/50 ring-2 ring-teal-200" : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                      isBest ? "bg-teal-600 text-white" : "bg-mist text-slate-500"
                    }`}
                  >
                    #{cq.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy-800">
                      {nameOf(cq.quote)}
                      {cq.distanceKm !== null ? (
                        <span className="ml-2 text-[11px] font-semibold text-slate-400">
                          {cq.distanceKm} km away
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">★ {num(cq.quote.provider?.rating).toFixed(1)} · responds ~{cq.quote.provider?.responseMinutes ?? "—"} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-navy-800">{formatZAR(cq.quote.amount * 100)}</p>
                    <p className={`text-xs font-bold ${isBest ? "text-teal-700" : "text-slate-400"}`}>{cq.overall}/100</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                  {cq.dimensions.map((d) => (
                    <div key={d.key} title={d.note}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{d.label}</span>
                        <span className="text-[10px] font-bold text-slate-500">{d.score}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            d.score >= 75 ? "bg-teal-500" : d.score >= 50 ? "bg-warn" : "bg-bad"
                          }`}
                          style={{ width: `${d.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {cq.tags.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {cq.tags.map((t) => (
                      <span key={t} className="rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="sr-only">{bar(cq.overall)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
