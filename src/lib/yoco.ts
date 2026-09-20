/**
 * Yoco Checkout API Integration
 *
 * Uses the Yoco Checkout API to create hosted payment sessions.
 * Supports all payment methods offered on Yoco's hosted page, including
 * Apple Pay, Google Pay and cards.
 *
 * Official endpoint (per Yoco docs): POST https://payments.yoco.com/api/checkouts
 *
 * Environment variables:
 *   YOCO_SECRET_KEY — Your Yoco secret API key (sk_live_... or sk_test_...)
 *   YOCO_WEBHOOK_SECRET — Optional webhook signing secret
 *   NEXT_PUBLIC_BASE_URL — Your public site URL for redirects
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const YOCO_API = "https://payments.yoco.com/api/checkouts";

/** Outbound Yoco calls must never hang a serverless function. */
const YOCO_TIMEOUT_MS = 20_000;

function getSecretKey(): string {
  return (process.env.YOCO_SECRET_KEY ?? "").trim();
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
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
 * Parse a useful error message from a non-200 Yoco API response.
 */
async function parseYocoError(response: Response): Promise<string> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return `Yoco did not respond (HTTP ${response.status}). Please try again.`;
  }
  if (!text) return `Yoco checkout failed (HTTP ${response.status}). Please try again.`;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (typeof parsed.message === "string" && parsed.message) return parsed.message;
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
    if (Array.isArray(parsed.errors) && parsed.errors.length) {
      const first = parsed.errors[0] as Record<string, unknown>;
      const msg = first.message ?? first.error;
      if (typeof msg === "string" && msg) return msg;
    }
    return text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

async function postCheckout(
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<{ ok: true; checkout: YocoCheckoutResponse } | { ok: false; error: string }> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return { ok: false, error: "PAYMENTS_NOT_CONFIGURED" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), YOCO_TIMEOUT_MS);
  try {
    const response = await fetch(YOCO_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorMessage = await parseYocoError(response);
      console.error("[Yoco] Checkout failed:", response.status, errorMessage);
      return { ok: false, error: errorMessage };
    }

    const checkout = (await response.json()) as YocoCheckoutResponse;
    if (!checkout?.id || !checkout?.redirectUrl) {
      console.error("[Yoco] Checkout response missing id/redirectUrl:", JSON.stringify(checkout).slice(0, 500));
      return { ok: false, error: "Payment provider returned an incomplete checkout. Please try again." };
    }
    return { ok: true, checkout };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[Yoco] Checkout request timed out");
      return { ok: false, error: "Payment provider timed out. Please try again." };
    }
    console.error("[Yoco] Network error:", err);
    return { ok: false, error: "Could not reach the payment provider. Check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Create a Yoco checkout session for a job payment.
 */
export async function createYocoCheckout(
  req: YocoCheckoutRequest,
): Promise<{ success: true; checkout: YocoCheckoutResponse } | { success: false; error: string }> {
  const baseUrl = getBaseUrl();
  const result = await postCheckout(
    {
      amount: req.amountCents,
      currency: "ZAR",
      successUrl: `${baseUrl}/payments/success?reference=${req.reference}&jobId=${req.jobId}`,
      cancelUrl: `${baseUrl}/payments/cancelled?reference=${req.reference}&jobId=${req.jobId}`,
      failureUrl: `${baseUrl}/payments/failed?reference=${req.reference}&jobId=${req.jobId}`,
      clientReferenceId: req.reference,
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
    },
    `job-${req.reference}`,
  );

  if (!result.ok) {
    return {
      success: false,
      error:
        result.error === "PAYMENTS_NOT_CONFIGURED"
          ? "Payments are temporarily unavailable. Please try again later."
          : result.error,
    };
  }
  return { success: true, checkout: result.checkout };
}

/**
 * Create a Yoco checkout session for wallet top-up.
 */
export async function createWalletTopupCheckout(req: {
  amountCents: number;
  reference: string;
  customerId: number;
}): Promise<{ success: true; checkout: YocoCheckoutResponse } | { success: false; error: string }> {
  const baseUrl = getBaseUrl();
  const result = await postCheckout(
    {
      amount: req.amountCents,
      currency: "ZAR",
      successUrl: `${baseUrl}/dashboard/customer?topup=success&reference=${req.reference}`,
      cancelUrl: `${baseUrl}/dashboard/customer?topup=cancelled`,
      failureUrl: `${baseUrl}/dashboard/customer?topup=failed&reference=${req.reference}`,
      clientReferenceId: req.reference,
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
    },
    `topup-${req.reference}`,
  );

  if (!result.ok) {
    return {
      success: false,
      error:
        result.error === "PAYMENTS_NOT_CONFIGURED"
          ? "Top-ups are temporarily unavailable. Please try again later."
          : result.error,
    };
  }
  return { success: true, checkout: result.checkout };
}

/**
 * Verify a Yoco webhook payload using HMAC-SHA256 when a webhook secret
 * is configured. Without a secret (local dev), all webhooks are accepted.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
