/**
 * Yoco Checkout API Integration
 *
 * Uses the Yoco Checkout API to create hosted payment sessions.
 * Supports all payment methods including Apple Pay, Google Pay and cards.
 *
 * Environment variables:
 *   YOCO_SECRET_KEY — Your Yoco secret API key (sk_live_... or sk_test_...)
 *   YOCO_WEBHOOK_SECRET — Optional webhook signing secret
 *   NEXT_PUBLIC_BASE_URL — Your public site URL for redirects
 */

const YOCO_API = "https://payments.yoco.com/api/checkout";

function getSecretKey(): string {
  return process.env.YOCO_SECRET_KEY ?? "";
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export type YocoCheckoutRequest = {
  amountCents: number;
  reference: string;
  jobId: number;
  quoteId: number;
  providerId: number;
  commissionCents: number;
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
 * Parse the real error message from a non-200 Yoco API response.
 */
async function parseYocoError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    // Yoco returns "message" or "error" in error responses
    if (typeof parsed.message === "string" && parsed.message) return parsed.message;
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
    if (Array.isArray(parsed.errors) && parsed.errors.length) {
      const first = parsed.errors[0] as Record<string, unknown>;
      return String(first.message ?? first.error ?? text.slice(0, 200));
    }
    return text.slice(0, 300) || `HTTP ${response.status}`;
  } catch {
    return `Yoco HTTP error ${response.status}`;
  }
}

/**
 * Create a Yoco checkout session for a job payment.
 */
export async function createYocoCheckout(
  req: YocoCheckoutRequest,
): Promise<{ success: true; checkout: YocoCheckoutResponse } | { success: false; error: string }> {
  const secretKey = getSecretKey();
  const baseUrl = getBaseUrl();

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
        clientReferenceId: req.reference,
        form: {
          name: "true",
          email: "true",
          address: { line1: "true", line2: "false", city: "true", province: "true", postalCode: "true" },
        },
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
            pricingDetails: { price: req.amountCents },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseYocoError(response);
      console.error("[Yoco] Checkout failed:", response.status, errorMessage);
      return { success: false, error: errorMessage };
    }

    const checkout = (await response.json()) as YocoCheckoutResponse;
    return { success: true, checkout };
  } catch (err) {
    console.error("[Yoco] Network error:", err);
    return { success: false, error: "Failed to connect to Yoco payment gateway." };
  }
}

/**
 * Create a Yoco checkout session for wallet top-up.
 */
export async function createWalletTopupCheckout(req: {
  amountCents: number;
  reference: string;
  customerId: number;
}): Promise<{ success: true; checkout: YocoCheckoutResponse } | { success: false; error: string }> {
  const secretKey = getSecretKey();
  const baseUrl = getBaseUrl();

  if (!secretKey) {
    console.error("[Yoco] YOCO_SECRET_KEY is required for live wallet top-ups");
    return { success: false, error: "Top-ups are temporarily unavailable. Please try again later." };
  }

  const successUrl = `${baseUrl}/dashboard/customer?topup=success&reference=${req.reference}`;
  const cancelUrl = `${baseUrl}/dashboard/customer?topup=cancelled`;

  try {
    const response = await fetch(YOCO_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: req.amountCents,
        currency: "ZAR",
        successUrl,
        cancelUrl,
        failureUrl: `${baseUrl}/dashboard/customer?topup=failed&reference=${req.reference}`,
        clientReferenceId: req.reference,
        form: {
          name: "true",
          email: "true",
          address: { line1: "true", line2: "false", city: "true", province: "true", postalCode: "true" },
        },
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
      const errorMessage = await parseYocoError(response);
      console.error("[Yoco] Wallet checkout failed:", response.status, errorMessage);
      return { success: false, error: errorMessage };
    }

    return { success: true, checkout: (await response.json()) as YocoCheckoutResponse };
  } catch (err) {
    console.error("[Yoco] Network error:", err);
    return { success: false, error: "Failed to connect to Yoco payment gateway." };
  }
}

/**
 * Verify Yoco webhook via HMAC-SHA256.
 * Accepts all webhooks in development (no secret set).
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  try {
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return expected === signature;
  } catch {
    return false;
  }
}
