import { getAdminSession } from "@/lib/auth";
import { getYocoGatewayStatus } from "@/lib/yoco-config";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/payments/gateway
 *
 * Admin-only Yoco gateway health check. Returns masked key metadata and
 * per-check pass/fail — never the secret key itself.
 */
export async function GET() {
  await ready();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Not authenticated." }, { status: 401 });
  return Response.json({ gateway: "yoco", ...getYocoGatewayStatus() });
}
