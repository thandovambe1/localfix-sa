/**
 * LocalFix SA — Single authoritative source for service-provider package pricing.
 *
 * Normal pricing:
 *   Starter  = R0 / month (free forever)
 *   Pro      = R195 / month
 *   Premium  = R495 / month
 *
 * Pro Onboarding Special:
 *   Qualifying NEW providers who onboard on Pro pay R0 until 30 November 2026.
 *   Normal Pro pricing (R195/month) resumes automatically on 1 December 2026.
 *
 * All amounts are stored in ZAR cents to match the existing payments ledger.
 * Every price used for money decisions MUST be resolved on the server through
 * `resolveProviderPlanPrice()`. Never trust a price supplied by the browser.
 */

export type ProviderPlanKey = "free" | "pro" | "premium";

/** Authoritative normal monthly prices in ZAR cents. */
export const PLAN_PRICE_CENTS: Record<ProviderPlanKey, number> = {
  free: 0,
  pro: 19_500,
  premium: 49_500,
};

/** Promotional Pro price in ZAR cents during the onboarding special. */
export const PROMO_PRO_PRICE_CENTS = 0;

/** Internal identifier stored against a provider that onboarded on the special. */
export const PRO_ONBOARDING_PROMO_CODE = "PRO_ONBOARDING_2026";

/**
 * Promotion window boundary.
 *
 * The special runs until the end of 30 November 2026 in South Africa
 * (Africa/Johannesburg = UTC+2, no daylight saving). Normal Pro pricing
 * therefore begins at 2026-12-01T00:00:00+02:00, which is
 * 2026-11-30T22:00:00Z in UTC.
 *
 * Storing the boundary as an absolute UTC instant avoids the classic bug
 * where a UTC-based comparison ends the promotion two hours early in SA.
 */
export const PROMO_ENDS_AT = new Date("2026-11-30T22:00:00.000Z");

/** Human-readable dates used consistently across UI and emails. */
export const PROMO_END_LABEL = "30 November 2026";
export const NORMAL_PRICING_START_LABEL = "1 December 2026";

/** True while the Pro onboarding special is running (SA-time aware). */
export function isProOnboardingPromoActive(now: Date = new Date()): boolean {
  return now.getTime() < PROMO_ENDS_AT.getTime();
}

/** Format ZAR cents for display, e.g. 19500 -> "R195". */
export function formatPlanPrice(cents: number): string {
  if (cents === 0) return "R0";
  const rands = cents / 100;
  return `R${Number.isInteger(rands) ? rands.toLocaleString("en-ZA") : rands.toFixed(2)}`;
}

export type ResolvedPlanPrice = {
  plan: ProviderPlanKey;
  /** Normal recurring monthly price in cents, ignoring any promotion. */
  normalPriceCents: number;
  /** Amount actually payable now, in cents. */
  payablePriceCents: number;
  /** True when the Pro onboarding special was applied. */
  promoApplied: boolean;
  /** Promo identifier stored on the provider record, when applied. */
  promoCode: string | null;
  /** Absolute instant the promotional price stops applying, when applied. */
  promoEndsAt: Date | null;
  /** Discount value in cents (normal - payable). */
  discountCents: number;
};

/**
 * SERVER-SIDE authoritative price resolution.
 *
 * @param plan            The package the provider selected.
 * @param opts.isNewOnboarding  True only for a brand-new provider application.
 *                              Existing providers/subscriptions are never
 *                              silently converted to the promotional price.
 * @param opts.now        Injectable clock for testing.
 */
export function resolveProviderPlanPrice(
  plan: ProviderPlanKey,
  opts: { isNewOnboarding: boolean; now?: Date } = { isNewOnboarding: false },
): ResolvedPlanPrice {
  const now = opts.now ?? new Date();
  const normalPriceCents = PLAN_PRICE_CENTS[plan];

  const promoApplied =
    plan === "pro" && opts.isNewOnboarding === true && isProOnboardingPromoActive(now);

  const payablePriceCents = promoApplied ? PROMO_PRO_PRICE_CENTS : normalPriceCents;

  return {
    plan,
    normalPriceCents,
    payablePriceCents,
    promoApplied,
    promoCode: promoApplied ? PRO_ONBOARDING_PROMO_CODE : null,
    promoEndsAt: promoApplied ? PROMO_ENDS_AT : null,
    discountCents: normalPriceCents - payablePriceCents,
  };
}

/** Package feature lists — unchanged from the existing packages. */
export const PLAN_FEATURES: Record<ProviderPlanKey, string[]> = {
  free: [
    "Single service province",
    "Up to 10 leads / month",
    "Verified profile & quotes",
    "Standard support",
  ],
  pro: [
    "Multiple provinces / branches",
    "Unlimited job leads",
    "Business analytics",
    "Priority support",
  ],
  premium: ["Everything in Pro", "Featured placement", "Account manager", "API access"],
};

/** Marketing feature lists used on the public pricing page — unchanged. */
export const PLAN_PAGE_FEATURES: Record<ProviderPlanKey, string[]> = {
  free: [
    "Verified business profile",
    "Up to 10 job leads a month",
    "Quote and chat in-platform",
    "Reviews and rating profile",
    "Standard support",
  ],
  pro: [
    "Unlimited job leads",
    "Priority placement in matching",
    "Business analytics dashboard",
    "Invoices, quotes and calendar",
    "Portfolio and before/after gallery",
    "Priority support",
  ],
  premium: [
    "Everything in Pro",
    "Premium Provider badge",
    "Featured placement on category pages",
    "Multi-branch and team accounts",
    "Dedicated account manager",
    "API access for job sync",
  ],
};

export const PLAN_NAMES: Record<ProviderPlanKey, string> = {
  free: "Starter",
  pro: "Pro",
  premium: "Premium",
};

/** Plans that permit multiple provinces / branches — existing business rule. */
export const PLAN_ALLOWS_MULTI_PROVINCE: Record<ProviderPlanKey, boolean> = {
  free: false,
  pro: true,
  premium: true,
};

export type PlanDisplay = {
  key: ProviderPlanKey;
  name: string;
  /** Price to show as the headline, e.g. "R0" during the Pro promo. */
  displayPrice: string;
  /** Normal price string, e.g. "R195". */
  normalPrice: string;
  /** Struck-through price shown when a promotion is active. */
  strikethroughPrice: string | null;
  note: string;
  promoActive: boolean;
  promoBadge: string | null;
  promoSubtext: string | null;
  multiProvince: boolean;
  features: string[];
  popular?: boolean;
};

/**
 * Display model for pricing UI. `forNewOnboarding` should be true on the
 * public pricing page and the provider sign-up form, because those audiences
 * are prospective new providers who qualify for the special.
 */
export function getPlanDisplays(
  opts: { forNewOnboarding?: boolean; now?: Date; pageFeatures?: boolean } = {},
): PlanDisplay[] {
  const { forNewOnboarding = true, now, pageFeatures = false } = opts;
  const keys: ProviderPlanKey[] = ["free", "pro", "premium"];

  return keys.map((key) => {
    const resolved = resolveProviderPlanPrice(key, { isNewOnboarding: forNewOnboarding, now });
    const promo = resolved.promoApplied;

    return {
      key,
      name: PLAN_NAMES[key],
      displayPrice: formatPlanPrice(resolved.payablePriceCents),
      normalPrice: formatPlanPrice(resolved.normalPriceCents),
      strikethroughPrice: promo ? formatPlanPrice(resolved.normalPriceCents) : null,
      note: promo
        ? `Free until ${PROMO_END_LABEL}`
        : key === "free"
          ? "per month, forever"
          : "per month, cancel anytime",
      promoActive: promo,
      promoBadge: promo ? "Service Provider Onboarding Special" : null,
      promoSubtext: promo
        ? `Then ${formatPlanPrice(resolved.normalPriceCents)}/month from ${NORMAL_PRICING_START_LABEL}`
        : null,
      multiProvince: PLAN_ALLOWS_MULTI_PROVINCE[key],
      features: pageFeatures ? PLAN_PAGE_FEATURES[key] : PLAN_FEATURES[key],
      popular: key === "pro",
    };
  });
}

/**
 * Describes the plan currently attached to an existing provider record,
 * honouring the promotional price they locked in at onboarding.
 */
export function describeProviderSubscription(provider: {
  plan: string;
  promoCode?: string | null;
  promoEndsAt?: Date | null;
  subscriptionPriceCents?: number | null;
}, now: Date = new Date()) {
  const plan = (["free", "pro", "premium"].includes(provider.plan)
    ? provider.plan
    : "free") as ProviderPlanKey;

  const normalPriceCents = PLAN_PRICE_CENTS[plan];
  const promoStillActive =
    Boolean(provider.promoCode) &&
    provider.promoEndsAt instanceof Date &&
    now.getTime() < provider.promoEndsAt.getTime();

  const currentPriceCents = promoStillActive ? 0 : normalPriceCents;

  return {
    plan,
    planName: PLAN_NAMES[plan],
    normalPriceCents,
    normalPrice: formatPlanPrice(normalPriceCents),
    currentPriceCents,
    currentPrice: formatPlanPrice(currentPriceCents),
    promoActive: promoStillActive,
    promoCode: provider.promoCode ?? null,
    promoEndsAt: provider.promoEndsAt ?? null,
    promoEndLabel: PROMO_END_LABEL,
    normalPricingStartLabel: NORMAL_PRICING_START_LABEL,
  };
}
