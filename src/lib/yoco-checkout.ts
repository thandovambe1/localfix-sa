/**
 * Yoco Checkout payload helpers.
 *
 * Yoco hosted checkout must be created server-side with the secret key.
 * We explicitly request card plus the wallet methods supported by Yoco
 * Checkout: Apple Pay (Safari/iOS) and Google Pay (Chrome/Android).
 */

export type CheckoutLineItem = {
  displayName: string;
  quantity: number;
  priceCents: number;
};

export type CheckoutUrls = {
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
};

export type YocoCheckoutPayloadInput = {
  amountCents: number;
  currency?: string;
  urls: CheckoutUrls;
  metadata: Record<string, string>;
  lineItems: CheckoutLineItem[];
};

/**
 * Builds a payload compatible with Yoco Checkout API.
 *
 * `paymentMethods.card` enables normal card entry. The two wallet objects
 * request Apple Pay and Google Pay. If a merchant account/region does not
 * support a wallet, Yoco ignores or rejects only that method; card still works.
 */
export function buildYocoCheckoutPayload(input: YocoCheckoutPayloadInput) {
  return {
    amount: input.amountCents,
    currency: input.currency ?? "ZAR",
    mode: "payment",
    successUrl: input.urls.successUrl,
    cancelUrl: input.urls.cancelUrl,
    failureUrl: input.urls.failureUrl,
    metadata: input.metadata,
    paymentMethods: {
      card: { enabled: true },
      applePay: { enabled: true },
      googlePay: { enabled: true },
    },
    lineItems: input.lineItems.map((item) => ({
      displayName: item.displayName,
      quantity: item.quantity,
      pricingDetails: {
        price: item.priceCents,
      },
    })),
  };
}

/**
 * Normalises Yoco error responses into a safe customer-facing message while
 * retaining enough detail in server logs for merchant support.
 */
export async function readYocoError(response: Response): Promise<{ status: number; message: string; raw: string }> {
  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const candidate =
    parsed && typeof parsed === "object"
      ? ((parsed as {
          message?: string;
          error?: string | { message?: string };
          errors?: Array<{ field?: string; message?: string }>;
          code?: string;
        })
      )
      : null;

  let message = `Payment gateway error ${response.status}`;
  if (candidate) {
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      message = candidate.message;
    } else if (typeof candidate.error === "object" && candidate.error?.message) {
      message = candidate.error.message;
    } else if (Array.isArray(candidate.errors) && candidate.errors[0]?.message) {
      message = candidate.errors[0].message;
    } else if (typeof candidate.code === "string") {
      message = candidate.code;
    }
  }

  return { status: response.status, message, raw };
}
