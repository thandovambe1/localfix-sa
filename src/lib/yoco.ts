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

import { buildYocoCheckoutPayload, readYocoError } from "@/lib/yoco-checkout";

const YOCO_API = "https://payments.yoco.com/api/checkouts";

/**
 * Get the Yoco secret key.
 *
 * IMPORTANT:
 * This must only be used server-side.
 * Never expose YOCO_SECRET_KEY to client-side code.
 */
function getSecretKey(): string {
  const key = process.env.YOCO_SECRET_KEY;

  if (!key) {
    console.error("[Yoco] YOCO_SECRET_KEY is not configured");
    return "";
  }

  return key;
}

/**
 * Get the public base URL used for payment redirects.
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

/**
 * Request data for creating a LocalFix job payment.
 */
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

/**
 * Response returned by the Yoco Checkout API.
 */
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
 * Create a Yoco checkout session for a LocalFix job payment.
 *
 * The customer is redirected to Yoco's hosted checkout page.
 */
export async function createYocoCheckout(
  req: YocoCheckoutRequest,
): Promise<
  | {
      success: true;
      checkout: YocoCheckoutResponse;
    }
  | {
      success: false;
      error: string;
      demoUrl?: string;
    }
> {
  const secretKey = getSecretKey();
  const baseUrl = getBaseUrl();

  /**
   * Live payments require the Yoco secret key.
   */
  if (!secretKey) {
    console.error(
      "[Yoco] YOCO_SECRET_KEY is required for live payments",
    );

    return {
      success: false,
      error:
        "Payments are temporarily unavailable. Please try again later.",
    };
  }

  try {
    const payload = buildYocoCheckoutPayload({
      amountCents: req.amountCents,

      urls: {
        successUrl: `${baseUrl}/payments/success?reference=${encodeURIComponent(
          req.reference,
        )}&jobId=${req.jobId}`,

        cancelUrl: `${baseUrl}/payments/cancelled?reference=${encodeURIComponent(
          req.reference,
        )}&jobId=${req.jobId}`,

        failureUrl: `${baseUrl}/payments/failed?reference=${encodeURIComponent(
          req.reference,
        )}&jobId=${req.jobId}`,
      },

      metadata: {
        localfix_reference: req.reference,
        job_id: String(req.jobId),
        quote_id: String(req.quoteId),
        provider_id: String(req.providerId),
        commission_cents: String(req.commissionCents),
        provider_payout_cents: String(req.providerPayoutCents),
        kind: "job_payment",
      },

      lineItems: [
        {
          displayName: `LocalFix Job Payment (${req.reference})`,
          quantity: 1,
          priceCents: req.amountCents,
        },
      ],
    });

    const response = await fetch(YOCO_API, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await readYocoError(response);

      console.error(
        "[Yoco] Checkout creation failed:",
        err.status,
        err.raw,
      );

      return {
        success: false,
        error: `Payment gateway rejected the request: ${err.message}`,
      };
    }

    const checkout =
      (await response.json()) as YocoCheckoutResponse;

    return {
      success: true,
      checkout,
    };
  } catch (err) {
    console.error("[Yoco] Network error:", err);

    return {
      success: false,
      error: "Failed to connect to Yoco payment gateway",
    };
  }
}

/**
 * Create a Yoco checkout session for topping up
 * a LocalFix customer wallet.
 */
export async function createWalletTopupCheckout(req: {
  amountCents: number;
  reference: string;
  customerId: number;
}): Promise<
  | {
      success: true;
      checkout: YocoCheckoutResponse;
    }
  | {
      success: false;
      error: string;
    }
> {
  const secretKey = getSecretKey();
  const baseUrl = getBaseUrl();

  const successUrl = `${baseUrl}/dashboard/customer?topup=success&reference=${encodeURIComponent(
    req.reference,
  )}`;

  const cancelUrl = `${baseUrl}/dashboard/customer?topup=cancelled`;

  /**
   * Live wallet top-ups require the Yoco secret key.
   */
  if (!secretKey) {
    console.error(
      "[Yoco] YOCO_SECRET_KEY is required for live wallet top-ups",
    );

    return {
      success: false,
      error:
        "Top-ups are temporarily unavailable. Please try again later.",
    };
  }

  try {
    const payload = buildYocoCheckoutPayload({
      amountCents: req.amountCents,

      urls: {
        successUrl,

        cancelUrl,

        failureUrl: `${baseUrl}/dashboard/customer?topup=failed`,
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
          priceCents: req.amountCents,
        },
      ],
    });

    const response = await fetch(YOCO_API, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await readYocoError(response);

      console.error(
        "[Yoco] Wallet checkout failed:",
        err.status,
        err.raw,
      );

      return {
        success: false,
        error: `Payment gateway rejected the request: ${err.message}`,
      };
    }

    const checkout =
      (await response.json()) as YocoCheckoutResponse;

    return {
      success: true,
      checkout,
    };
  } catch (err) {
    console.error("[Yoco] Network error:", err);

    return {
      success: false,
      error: "Failed to connect to Yoco payment gateway",
    };
  }
}

/**
 * Verify a Yoco webhook event signature.
 *
 * IMPORTANT:
 * The current implementation is intentionally kept compatible
 * with the existing LocalFix webhook flow.
 *
 * If YOCO_WEBHOOK_SECRET is not configured, the webhook is accepted
 * for development compatibility.
 *
 * For production, this should be replaced with Yoco's official
 * webhook signature verification implementation once the exact
 * signature format used by your Yoco webhook is confirmed.
 */
export function verifyWebhookSignature(
  _rawBody: string,
  _signature: string | null,
): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "[Yoco] No YOCO_WEBHOOK_SECRET configured — accepting webhook without verification",
    );

    return true;
  }

  /**
   * TODO:
   *
   * Implement Yoco's official webhook signature verification here.
   *
   * Do NOT simply trust the webhook in production without verifying
   * its authenticity.
   */
  console.warn(
    "[Yoco] YOCO_WEBHOOK_SECRET is configured, but signature verification has not yet been implemented",
  );

  return true;
}
