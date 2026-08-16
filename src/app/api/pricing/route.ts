import {
  getPlanDisplays,
  isProOnboardingPromoActive,
  NORMAL_PRICING_START_LABEL,
  PROMO_ENDS_AT,
  PROMO_END_LABEL,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * GET /api/pricing
 *
 * Public, unauthenticated. Returns the authoritative, server-calculated
 * service-provider package pricing and current promotion state so every
 * client surface renders identical values.
 */
export async function GET() {
  return Response.json({
    plans: getPlanDisplays({ forNewOnboarding: true }),
    promotion: {
      active: isProOnboardingPromoActive(),
      name: "Service Provider Onboarding Special",
      endsAt: PROMO_ENDS_AT.toISOString(),
      endLabel: PROMO_END_LABEL,
      normalPricingStartLabel: NORMAL_PRICING_START_LABEL,
    },
  });
}
