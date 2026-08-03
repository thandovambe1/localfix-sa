import { db } from "@/db";
import { messages } from "@/db/schema";
import { getJobMessages, ready } from "@/lib/queries";
import { summariseThread } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const jobId = Number(new URL(request.url).searchParams.get("jobId") ?? 0);
  if (!jobId) return Response.json({ messages: [], summary: "" });
  const rows = await getJobMessages(jobId);
  return Response.json({ messages: rows, summary: summariseThread(rows) });
}

export async function POST(request: Request) {
  await ready();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const jobId = Number(body.jobId);
  const text = String(body.body ?? "").trim();
  if (!jobId || !text) return Response.json({ error: "jobId and body are required" }, { status: 400 });

  const [message] = await db
    .insert(messages)
    .values({
      jobId,
      providerId: body.providerId ? Number(body.providerId) : null,
      sender: body.sender === "provider" ? "provider" : "customer",
      authorName: String(body.authorName ?? (body.sender === "provider" ? "Provider" : "Customer")),
      body: text,
    })
    .returning();

  return Response.json({ message }, { status: 201 });
}
