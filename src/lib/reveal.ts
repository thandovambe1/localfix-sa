import type { Payment, Quote } from "@/db/schema";

/**
 * Marketplace privacy rules.
 *
 * A customer must never see a provider's business identity (name, owner,
 * logo, direct contact) by browsing. Identity is revealed ONLY for the
 * single accepted quote of a job, and ONLY after payment has cleared.
 * Everything else shows an anonymous "Pro A / Pro B …" alias.
 */

export function isPaymentSettled(p?: Payment | null): boolean {
  return !!p && (p.status === "paid" || p.status === "paid_out");
}

export function quoteRevealed(q: Quote, p?: Payment | null): boolean {
  return q.status === "accepted" && isPaymentSettled(p);
}

/** Stable anonymous alias by position: Pro A, Pro B, Pro C … */
export function aliasForIndex(i: number): string {
  return `Pro ${String.fromCharCode(65 + (Math.max(0, i) % 26))}`;
}

/**
 * Build a quoteId → alias map from an ordered quote list so the alias is
 * consistent across the quote cards, the comparison agent and documents.
 */
export function aliasMapFor(quotes: { id: number }[]): Record<number, string> {
  const map: Record<number, string> = {};
  quotes.forEach((q, i) => {
    map[q.id] = aliasForIndex(i);
  });
  return map;
}
