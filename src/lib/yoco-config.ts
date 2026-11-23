/**
 * Yoco gateway configuration — single source of truth for keys.
 *
 * Keys are ONLY ever read on the server (API routes / server components).
 * Never import this file from client components.
 *
 * Required Vercel env vars:
 *   YOCO_SECRET_KEY    -> sk_test_... (sandbox) or sk_live_... (production)
 *   YOCO_WEBHOOK_SECRET -> whsec_... from Yoco Dashboard > Settings > Webhooks
 *   NEXT_PUBLIC_BASE_URL -> https://your-domain (for Yoco success/cancel/fail redirects + webhooks)
 */

export type YocoMode = "live" | "test" | "missing";

export type YocoGatewayStatus = {
  configured: boolean;
  mode: YocoMode;
  keyPrefix: string | null;
  keyLength: number;
  keyValidFormat: boolean;
  webhookConfigured: boolean;
  baseUrl: string | null;
  baseUrlIsHttps: boolean;
  webhookUrl: string | null;
  checkoutEndpoint: string;
  checks: { label: string; ok: boolean; hint: string }[];
  error: string | null;
};

const YOCO_CHECKOUT_ENDPOINT = "https://payments.yoco.com/api/checkouts";

function maskKey(key: string): string {
  if (key.length <= 12) return `${key.slice(0, 4)}…`;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function getYocoSecretKey(): string {
  return (process.env.YOCO_SECRET_KEY ?? "").trim();
}

export function getYocoMode(key: string = getYocoSecretKey()): YocoMode {
  if (!key) return "missing";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "missing";
}

export function getPublicBaseUrl(): string {
  const base =
    (process.env.NEXT_PUBLIC_BASE_URL ?? "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return base.replace(/\/$/, "");
}

/**
 * Full gateway health check. Safe to expose via an admin-only API —
 * it returns only masked key metadata, never the secret itself.
 */
export function getYocoGatewayStatus(): YocoGatewayStatus {
  const key = getYocoSecretKey();
  const mode = getYocoMode(key);
  const configured = mode !== "missing";
  const webhookConfigured = Boolean((process.env.YOCO_WEBHOOK_SECRET ?? "").trim());
  const baseUrl = getPublicBaseUrl();
  const baseUrlIsHttps = baseUrl.startsWith("https://");
  const keyValidFormat = mode !== "missing" && key.length >= 20;

  const checks: YocoGatewayStatus["checks"] = [
    {
      label: "Secret key present",
      ok: configured,
      hint: configured
        ? `Found ${mode === "live" ? "LIVE" : "TEST"} key ${maskKey(key)}`
        : "Set YOCO_SECRET_KEY in Vercel > Settings > Environment Variables",
    },
    {
      label: "Key format valid",
      ok: keyValidFormat,
      hint: keyValidFormat
        ? "Starts with sk_live_ or sk_test_"
        : "Key must start with sk_live_ (production) or sk_test_ (sandbox)",
    },
    {
      label: "Live mode",
      ok: mode === "live",
      hint:
        mode === "live"
          ? "Real money will move. Yoco dashboard must have Apple Pay / Google Pay / Cards enabled."
          : mode === "test"
            ? "TEST key detected — use Yoco test cards only. Switch to sk_live_ for real payments."
            : "No key — payments and wallet top-ups will fail until YOCO_SECRET_KEY is set.",
    },
    {
      label: "Webhook secret configured",
      ok: webhookConfigured,
      hint: webhookConfigured
        ? "Payment confirmations are signature-verified."
        : "Set YOCO_WEBHOOK_SECRET so paid webhooks are verified (Yoco Dashboard > Settings > Webhooks).",
    },
    {
      label: "Public base URL is HTTPS",
      ok: baseUrlIsHttps,
      hint: baseUrlIsHttps
        ? `Yoco redirects + webhooks use ${baseUrl}`
        : `Base URL is ${baseUrl} — Yoco requires a public HTTPS URL in production. Set NEXT_PUBLIC_BASE_URL.`,
    },
  ];

  const firstFailure = checks.find((c) => !c.ok && c.label !== "Live mode");
  return {
    configured,
    mode,
    keyPrefix: key ? maskKey(key) : null,
    keyLength: key.length,
    keyValidFormat,
    webhookConfigured,
    baseUrl,
    baseUrlIsHttps,
    webhookUrl: baseUrl ? `${baseUrl}/api/payments/webhook` : null,
    checkoutEndpoint: YOCO_CHECKOUT_ENDPOINT,
    checks,
    error: firstFailure ? firstFailure.hint : null,
  };
}
