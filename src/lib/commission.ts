/**
 * LocalFix SA Platform Commission Engine
 *
 * The customer pays the full quote amount via Yoco checkout.
 * LocalFix SA retains a 13% admin commission and pays out the
 * remaining 87% to the service provider.
 *
 * All monetary values are in ZAR cents to avoid floating-point errors.
 */

/** Platform commission rate: 13% */
export const COMMISSION_RATE = 0.13;

/** Human-readable commission percentage */
export const COMMISSION_PERCENT = 13;

export type CommissionBreakdown = {
  /** Full amount charged to the customer, in cents. */
  totalCents: number;
  /** Commission retained by LocalFix SA, in cents. */
  commissionCents: number;
  /** Net payout to the service provider, in cents. */
  providerPayoutCents: number;
  /** Commission rate applied (0.13). */
  rate: number;
  /** Display values in rands. */
  display: {
    total: string;
    commission: string;
    payout: string;
    rate: string;
  };
};

/**
 * Calculate the commission split for a given quote amount.
 *
 * @param quoteAmountRands — The accepted quote amount in whole rands (e.g. 12400)
 * @returns Full breakdown with cents and display values
 */
export function calculateCommission(quoteAmountRands: number): CommissionBreakdown {
  const totalCents = Math.round(quoteAmountRands * 100);
  const commissionCents = Math.round(totalCents * COMMISSION_RATE);
  const providerPayoutCents = totalCents - commissionCents;

  return {
    totalCents,
    commissionCents,
    providerPayoutCents,
    rate: COMMISSION_RATE,
    display: {
      total: formatZAR(totalCents),
      commission: formatZAR(commissionCents),
      payout: formatZAR(providerPayoutCents),
      rate: `${COMMISSION_PERCENT}%`,
    },
  };
}

/**
 * Generate a unique payment reference.
 */
export function paymentReference(): string {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `PAY-${n}`;
}

/**
 * Format cents to ZAR display string.
 */
export function formatZAR(cents: number): string {
  const rands = cents / 100;
  return `R${rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format cents to a compact ZAR string (whole rands).
 */
export function formatZARCompact(cents: number): string {
  return `R${Math.round(cents / 100).toLocaleString("en-ZA")}`;
}
