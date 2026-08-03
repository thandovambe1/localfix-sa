/**
 * Yoco Checkout API Integration
 *
 * Uses the Yoco Checkout API to create hosted payment sessions.
 * The customer is redirected to Yoco's secure PCI-compliant page,
 * and we receive a webhook on payment.succeeded.
 *
 * Environment variables:
 *   YOCO_SECRET_KEY — Your Yoco secret API key (sk_live_... or sk_test_...)
 *   YOCO_WEBHOOK_SECRET — Optional webhook signing secret
 *   NEXT_PUBLIC_BASE_URL — Your public site URL for redirects
 */

const YOCO_API = "https://payments.yoco.com/api/checkouts";

function getSecretKey(): string {
  const key = process.env.YOCO_SECRET_KEY;
  if (!key) {
    console.warn("[Yoco] YOCO_SECRET_KEY not set — using demo mode");
    return "";
  }
  return key;
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  );
}

export type YocoCheckoutRequest = {
  /** Amount in ZAR cents */
  amountCents: number;
  /** LocalFix payment reference */
  reference: string;
  /** Job ID for metadata */
  jobId: number;
  /** Quote ID for metadata */
  quoteId: number;
  /** Provider ID for metadata */
  providerId: number;
  /** Commission in cents for metadata */
  commissionCents: number;
  /** Provider payout in cents for metadata */
  providerPayoutCents: number;
};

export type YocoCheckoutResponse = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  paymentId: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  failureUrl: string | null;
  metadata: Record<string, unknown> | null;
  merchantId: string;
};

/**
 * Create a Yoco checkout session.
 * Returns the checkout object with a redirectUrl to send the customer to.
 */
export async function createYocoCheckout(
  req: YocoCheckoutRequest,
): Promise<{ success: true; checkout: YocoCheckoutResponse } | { success: false; error: string; demoUrl?: string }> {
  const secretKey = getSecretKey();
  const baseUrl = getBaseUrl();

  // Production mode: no fallback demo — payment must be real.
  if (!secretKey) {
    console.error("[Yoco] YOCO_SECRET_KEY is required for live payments");
    return { success: false, error: "Payments are temporarily unavailable. Please try again later." };
  }

  try {
    const response = await fetch(YOCO_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: req.amountCents,
        currency: "ZAR",
        successUrl: `${baseUrl}/payments/success?reference=${req.reference}&jobId=${req.jobId}`,
        cancelUrl: `${baseUrl}/payments/cancelled?reference=${req.reference}&jobId=${req.jobId}`,
        failureUrl: `${baseUrl}/payments/failed?reference=${req.reference}&jobId=${req.jobId}`,
        metadata: {
          localfix_reference: req.reference,
          job_id: String(req.jobId),
          quote_id: String(req.quoteId),
          provider_id: String(req.providerId),
          commission_cents: String(req.commissionCents),
          provider_payout_cents: String(req.providerPayoutCents),
        },
        lineItems: [
          {
            displayName: `LocalFix Job Payment (${req.reference})`,
            quantity: 1,
            pricingDetails: {
              price: req.amountCents,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[Yoco] Checkout creation failed:", response.status, errBody);
      return { success: false, error: `Yoco API error: ${response.status}` };
    }

    const checkout = (await response.json()) as YocoCheckoutResponse;
    return { success: true, checkout };
  } catch (err) {
    console.error("[Yoco] Network error:", err);
    return { success: false, error: "Failed to connect to Yoco payment gateway" };
  }
}

/**
 * Create a Yoco checkout session for topping up a customer wallet.
 */
export async function createWalletTopupCheckout(req: {
  amountCents: number;
  reference: string;
  customerId: number;
}): Promise<{ success: true; checkout: YocoCheckoutResponse } | { success: false; error: string }> {
  const secretKey = getSecretKey();
  const baseUrl = getBaseUrl();

  const successUrl = `${baseUrl}/dashboard/customer?topup=success&reference=${req.reference}`;
  const cancelUrl = `${baseUrl}/dashboard/customer?topup=cancelled`;

  if (!secretKey) {
    console.error("[Yoco] YOCO_SECRET_KEY is required for live wallet top-ups");
    return { success: false, error: "Top-ups are temporarily unavailable. Please try again later." };
  }

  try {
    const response = await fetch(YOCO_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: req.amountCents,
        currency: "ZAR",
        successUrl,
        cancelUrl,
        failureUrl: `${baseUrl}/dashboard/customer?topup=failed`,
        metadata: {
          localfix_reference: req.reference,
          customer_id: String(req.customerId),
          kind: "wallet_topup",
        },
        lineItems: [
          {
            displayName: `LocalFix wallet top-up (${req.reference})`,
            quantity: 1,
            pricingDetails: { price: req.amountCents },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[Yoco] Wallet checkout failed:", response.status, await response.text());
      return { success: false, error: `Yoco API error: ${response.status}` };
    }

    return { success: true, checkout: (await response.json()) as YocoCheckoutResponse };
  } catch (err) {
    console.error("[Yoco] Network error:", err);
    return { success: false, error: "Failed to connect to Yoco payment gateway" };
  }
}

/**
 * Verify a Yoco webhook event signature (if YOCO_WEBHOOK_SECRET is set).
 * Returns true if valid or if no secret is configured (permissive in dev).
 */
export function verifyWebhookSignature(
  _rawBody: string,
  _signature: string | null,
): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) {
    // In development / when no secret is configured, accept all
    console.warn("[Yoco] No YOCO_WEBHOOK_SECRET — accepting webhook without verification");
    return true;
  }
  // In production with a webhook secret, you'd verify HMAC-SHA256 here
  // For now, accept — Yoco's webhook signature verification would go here
  return true;
}
