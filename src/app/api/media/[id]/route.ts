import { loadAuthorizedMedia } from "@/lib/media";
import { ready } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Secure media retrieval.
 *
 * Media is never exposed as a public storage URL. This route authenticates
 * the viewer, verifies their authorization against the associated job, then
 * streams the bytes from persistent PostgreSQL storage.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const { id } = await params;
  const result = await loadAuthorizedMedia(Number(id));

  if (result.status !== 200) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": result.media.mimeType,
      "Content-Length": String(result.bytes.length),
      "Content-Disposition": `inline; filename="${result.media.originalName.replace(/["\\\r\n]/g, "_")}"`,
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
