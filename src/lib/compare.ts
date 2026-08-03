import type { Job, Provider, Quote } from "@/db/schema";
import { haversineKm } from "@/lib/geo";
import { num } from "@/lib/format";

export type QuoteWithProvider = Quote & { provider: Provider | null };

export type DimensionScore = {
  key: "price" | "distance" | "availability" | "reputation" | "coverage";
  label: string;
  weight: number;
  score: number; // 0–100
  note: string;
};

export type ComparedQuote = {
  quote: QuoteWithProvider;
  dimensions: DimensionScore[];
  overall: number; // 0–100
  rank: number;
  tags: string[];
  distanceKm: number | null;
};

export type ComparisonResult = {
  quotes: ComparedQuote[];
  bestOverall: ComparedQuote | null;
  bestPrice: ComparedQuote | null;
  fastest: ComparedQuote | null;
  topRated: ComparedQuote | null;
  summary: string;
  generatedAt: string;
};

/** Parse an availability string into an approximate hours-to-start. */
function availabilityHours(text: string, responseMinutes: number): number {
  const t = text.toLowerCase();
  if (/today|now|immediate|within (an )?hour|60 min/.test(t)) return 2;
  if (/24|tomorrow|next day/.test(t)) return 24;
  if (/48|two days|2 days/.test(t)) return 48;
  if (/week|7 days|monday|tuesday|wednesday|thursday|friday|saturday|sunday|from \d/.test(t)) return 96;
  // Fall back to the provider's typical response behaviour
  return Math.min(120, Math.max(4, responseMinutes / 10));
}

function score01(value: number, best: number, worst: number): number {
  if (worst === best) return 1;
  return Math.max(0, Math.min(1, (worst - value) / (worst - best)));
}

/**
 * The LocalFix quoting agent. Ranks every quote for a job across five
 * weighted dimensions and writes a plain-language recommendation.
 */
export function compareQuotes(
  quotes: QuoteWithProvider[],
  job: Job,
  opts: { anonymous?: boolean; aliases?: Record<number, string> } = {},
): ComparisonResult {
  const { anonymous = false, aliases = {} } = opts;
  const nameOf = (q: { id: number; provider: { businessName: string } | null }) =>
    anonymous ? (aliases[q.id] ?? "a verified provider") : (q.provider?.businessName ?? "a provider");
  const enriched = quotes.map((q) => {
    const p = q.provider;
    const distanceKm = p ? haversineKm(num(job.lat), num(job.lng), num(p.lat), num(p.lng)) : null;
    const responseMin = p?.responseMinutes ?? 60;

    const dimensions: DimensionScore[] = [
      {
        key: "price",
        label: "Price",
        weight: 0.35,
        score: 0,
        note: "",
      },
      {
        key: "distance",
        label: "Distance",
        weight: 0.2,
        score: distanceKm === null ? 50 : 0,
        note: distanceKm === null ? "Location unknown" : `${distanceKm} km from the job`,
      },
      {
        key: "availability",
        label: "Availability",
        weight: 0.2,
        score: 0,
        note: q.availability,
      },
      {
        key: "reputation",
        label: "Reputation",
        weight: 0.15,
        score: p
          ? Math.round(
              (num(p.rating) / 5) * 60 +
                Math.min(1, p.reviewCount / 150) * 20 +
                (p.successRate / 100) * 20,
            )
          : 40,
        note: p ? `★ ${num(p.rating).toFixed(1)} · ${p.reviewCount} reviews · ${p.successRate}% success` : "Unverified",
      },
      {
        key: "coverage",
        label: "Coverage",
        weight: 0.1,
        score: 0,
        note: "",
      },
    ];

    return { q, p, distanceKm, responseMin, hours: availabilityHours(q.availability, responseMin), dimensions };
  });

  const amounts = enriched.map((e) => e.q.amount);
  const distances = enriched.map((e) => e.distanceKm ?? 60);
  const hours = enriched.map((e) => e.hours);
  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);

  for (const e of enriched) {
    // Price: best = cheapest; penalise quotes far above the pack
    const priceRaw = score01(e.q.amount, minAmount, maxAmount || minAmount + 1);
    const overBudget = job.budgetMax ? Math.max(0, (e.q.amount - job.budgetMax) / job.budgetMax) : 0;
    e.dimensions[0].score = Math.round(Math.max(0, priceRaw * 100 - overBudget * 40));
    e.dimensions[0].note =
      e.q.amount === minAmount
        ? "Lowest quote received"
        : `${Math.round(((e.q.amount - minAmount) / minAmount) * 100)}% above the lowest quote`;

    // Distance
    if (e.distanceKm !== null) {
      e.dimensions[1].score = Math.round(score01(e.distanceKm, Math.min(...distances), Math.max(...distances, 1)) * 100);
    }

    // Availability: fastest start wins; small bonus for quick responders
    const availRaw = score01(e.hours, Math.min(...hours), Math.max(...hours, 1));
    e.dimensions[2].score = Math.round(Math.min(100, availRaw * 85 + Math.max(0, 15 - e.responseMin / 8)));

    // Coverage: warranty + materials + verification badges
    const badgeBonus = Math.min(20, (e.p?.badges.length ?? 0) * 4);
    e.dimensions[4].score = Math.round(
      Math.min(100, (e.q.includesMaterials ? 45 : 15) + Math.min(35, e.q.warrantyMonths) + badgeBonus),
    );
    e.dimensions[4].note = `${e.q.warrantyMonths}-month warranty · materials ${e.q.includesMaterials ? "included" : "excluded"}`;

    const overall = e.dimensions.reduce((s, d) => s + d.score * d.weight, 0);
    (e as unknown as { overall: number }).overall = Math.round(overall);
  }

  const ranked = [...enriched].sort(
    (a, b) => (b as unknown as { overall: number }).overall - (a as unknown as { overall: number }).overall,
  );

  const result: ComparedQuote[] = ranked.map((e, idx) => ({
    quote: e.q,
    dimensions: e.dimensions,
    overall: (e as unknown as { overall: number }).overall,
    rank: idx + 1,
    distanceKm: e.distanceKm,
    tags: [],
  }));

  const bestOverall = result[0] ?? null;
  const bestPrice = [...result].sort((a, b) => a.quote.amount - b.quote.amount)[0] ?? null;
  const fastest = [...result].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))[0] ?? null;
  const topRated = [...result].sort(
    (a, b) => num(b.quote.provider?.rating) - num(a.quote.provider?.rating),
  )[0] ?? null;

  // Tag the standouts
  if (bestOverall) bestOverall.tags.push("Best overall");
  if (bestPrice && bestPrice !== bestOverall) bestPrice.tags.push("Best price");
  if (fastest && !fastest.tags.length) fastest.tags.push("Closest to you");
  if (topRated && !topRated.tags.includes("Best overall")) topRated.tags.push("Top rated");

  const summary = buildSummary(result, bestOverall, bestPrice, job, nameOf);

  return {
    quotes: result,
    bestOverall,
    bestPrice,
    fastest,
    topRated,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function buildSummary(
  result: ComparedQuote[],
  best: ComparedQuote | null,
  cheapest: ComparedQuote | null,
  job: Job,
  nameOf: (q: { id: number; provider: { businessName: string } | null }) => string,
): string {
  if (!result.length) return "No quotes yet — the network has been notified and quotes usually arrive within the hour.";
  if (result.length === 1) {
    const q = result[0];
    return `One quote received so far from ${nameOf(q.quote)} at ${zar(q.quote.amount)}. I recommend waiting for at least one more quote before accepting, so you can compare price and availability.`;
  }

  const spread = result[0].quote.amount
    ? Math.round(((result[result.length - 1].quote.amount - result[0].quote.amount) / result[0].quote.amount) * 100)
    : 0;

  const parts: string[] = [];
  parts.push(
    `I reviewed ${result.length} quotes for "${job.title}". ${(best ? nameOf(best.quote) : "The top pick")} scores ${best?.overall}/100 overall, balancing price, distance, availability, reputation and coverage.`,
  );
  if (spread > 15) {
    parts.push(`Prices vary by ${spread}%, so the cheapest option (${(cheapest ? nameOf(cheapest.quote) : "the cheapest")}) is worth a hard look — but check warranty and materials before deciding.`);
  } else {
    parts.push(`Pricing is tight (within ${spread}% of each other), so reputation and availability are the real differentiators.`);
  }
  const materialsGap = result.find((r) => !r.quote.includesMaterials);
  if (materialsGap) {
    parts.push(`Heads up: ${nameOf(materialsGap.quote)}'s quote excludes materials, which may make it more expensive than it looks.`);
  }
  parts.push("Tap any quote to open the official LocalFix quote document, or accept the best value directly from your inbox.");
  return parts.join(" ");
}

function zar(rands: number) {
  return `R${rands.toLocaleString("en-ZA")}`;
}
