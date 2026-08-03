import { CATEGORY_BY_SLUG, SERVICE_CATEGORIES } from "@/lib/services";

export type AiAnalysis = {
  categorySlug: string;
  categoryName: string;
  confidence: number;
  complexity: "simple" | "standard" | "complex" | "major project";
  budgetLow: number;
  budgetHigh: number;
  summary: string;
  suggestions: string[];
  duplicateRisk: "low" | "medium" | "high";
};

const COMPLEX_HINTS = [
  "renovation",
  "extension",
  "full house",
  "commercial",
  "three phase",
  "foundation",
  "rewire",
  "new build",
  "body corporate",
];
const SIMPLE_HINTS = ["small", "quick", "one", "single", "replace tap", "mount", "assemble", "clean"];

/**
 * Lightweight on-platform AI heuristics. Deterministic, zero-latency and
 * upgradeable to an LLM provider without changing the calling contract.
 */
export function analyseJob(input: {
  title: string;
  description: string;
  categorySlug?: string;
  budgetMax?: number | null;
  photos?: number;
  hasAddress?: boolean;
  hasTimes?: boolean;
}): AiAnalysis {
  const text = `${input.title} ${input.description}`.toLowerCase();

  let bestSlug = input.categorySlug && CATEGORY_BY_SLUG.has(input.categorySlug) ? input.categorySlug : "";
  let bestScore = bestSlug ? 3 : 0;

  for (const cat of SERVICE_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) if (text.includes(kw)) score += 2;
    if (text.includes(cat.name.toLowerCase())) score += 3;
    for (const item of cat.items) if (text.includes(item.toLowerCase())) score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestSlug = cat.slug;
    }
  }
  if (!bestSlug) bestSlug = "handyman";

  const cat = CATEGORY_BY_SLUG.get(bestSlug)!;
  const words = text.split(/\s+/).filter(Boolean).length;

  let complexity: AiAnalysis["complexity"] = "standard";
  if (COMPLEX_HINTS.some((h) => text.includes(h)) || words > 90) complexity = "complex";
  if (SIMPLE_HINTS.some((h) => text.includes(h)) && words < 40) complexity = "simple";
  if ((input.budgetMax ?? 0) > 100000 || text.includes("full renovation")) complexity = "major project";

  const factor =
    complexity === "simple" ? 0.35 : complexity === "standard" ? 0.7 : complexity === "complex" ? 1 : 1.4;

  const budgetLow = Math.round((cat.baseLow * Math.max(0.6, factor)) / 50) * 50;
  const budgetHigh = Math.round((cat.baseHigh * factor) / 100) * 100;

  const suggestions: string[] = [];
  if ((input.photos ?? 0) === 0) suggestions.push("Add 2–3 photos — quotes come back 4× faster with visuals.");
  if (input.description.trim().length < 60)
    suggestions.push("Describe the problem in a bit more detail (what, where, since when).");
  if (!input.hasAddress) suggestions.push("Pin the exact property location for accurate travel pricing.");
  if (!input.hasTimes) suggestions.push("Add preferred appointment times so providers can commit to a slot.");
  if (!input.budgetMax) suggestions.push(`Most ${cat.name.toLowerCase()} jobs like this land between R${budgetLow.toLocaleString("en-ZA")} and R${budgetHigh.toLocaleString("en-ZA")}.`);

  const summary = `${cat.name} · ${complexity} job in scope. ${
    input.title.trim() || "Untitled request"
  }. Estimated fair range R${budgetLow.toLocaleString("en-ZA")}–R${budgetHigh.toLocaleString("en-ZA")}.`;

  return {
    categorySlug: bestSlug,
    categoryName: cat.name,
    confidence: Math.min(98, 55 + bestScore * 6),
    complexity,
    budgetLow,
    budgetHigh,
    summary,
    suggestions,
    duplicateRisk: words < 6 ? "medium" : "low",
  };
}

export function matchScore(opts: {
  distanceKm: number;
  radiusKm: number;
  rating: number;
  responseMinutes: number;
  jobsCompleted: number;
  emergency: boolean;
  isEmergencyJob: boolean;
}): number {
  const proximity = Math.max(0, 1 - opts.distanceKm / Math.max(opts.radiusKm, 1)) * 40;
  const quality = (opts.rating / 5) * 30;
  const speed = Math.max(0, 1 - opts.responseMinutes / 240) * 15;
  const volume = Math.min(1, opts.jobsCompleted / 200) * 10;
  const emergencyBonus = opts.isEmergencyJob && opts.emergency ? 5 : 0;
  return Math.round(proximity + quality + speed + volume + emergencyBonus);
}

export function summariseThread(messages: { authorName: string; body: string }[]): string {
  if (!messages.length) return "No conversation yet. Start by confirming access times and scope.";
  const last = messages.slice(-4).map((m) => `${m.authorName}: ${m.body}`).join(" ");
  const money = last.match(/R\s?\d[\d\s,.]*/);
  const dates = last.match(/(mon|tue|wed|thu|fri|sat|sun|tomorrow|today)[a-z]*/i);
  const parts = [`${messages.length} messages exchanged.`];
  if (money) parts.push(`Pricing discussed around ${money[0].trim()}.`);
  if (dates) parts.push(`Scheduling mentioned for ${dates[0]}.`);
  parts.push("Next step: confirm the quote and lock in the appointment.");
  return parts.join(" ");
}
