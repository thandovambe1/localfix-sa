import { retryPendingEmails } from "@/lib/mailer";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/retry-email
 *
 * Retries due pending outbound emails. Safe to call repeatedly; only rows
 * whose nextRetryAt has passed are processed.
 */
export async function GET(request: Request) {
  await ready();

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await retryPendingEmails(25);
  return Response.json({ ok: true, ...result });
}
