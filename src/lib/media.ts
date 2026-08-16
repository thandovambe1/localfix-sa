import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts, jobMedia, jobs, payments, quotes, type Job, type JobMedia } from "@/db/schema";
import { getAdminSession, getCustomerSession, getProviderSession } from "@/lib/auth";

export const ALLOWED_JOB_MEDIA_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function mediaKind(mimeType: string): "image" | "video" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

/** Vercel-friendly raw-size guard. Base64 adds ~33% overhead. */
export const MAX_JOB_MEDIA_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_JOB_MEDIA_TOTAL_BYTES = 2.5 * 1024 * 1024;
export const MAX_JOB_MEDIA_FILES = 5;

export type IncomingJobMedia = {
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  fileData?: string;
};

export function validateIncomingJobMedia(input: unknown):
  | { ok: true; media: Required<IncomingJobMedia>[]; totalBytes: number }
  | { ok: false; error: string } {
  const rows = Array.isArray(input) ? input : [];
  if (rows.length > MAX_JOB_MEDIA_FILES) {
    return { ok: false, error: `Upload up to ${MAX_JOB_MEDIA_FILES} photos/videos per request.` };
  }

  const media: Required<IncomingJobMedia>[] = [];
  let totalBytes = 0;

  for (const item of rows) {
    const row = item as IncomingJobMedia;
    const originalName = String(row.originalName ?? "upload").slice(0, 160);
    const mimeType = String(row.mimeType ?? "").toLowerCase();
    const sizeBytes = Number(row.sizeBytes ?? 0);
    const fileData = String(row.fileData ?? "");

    if (!ALLOWED_JOB_MEDIA_MIME.has(mimeType)) {
      return { ok: false, error: `${originalName}: unsupported file type (${mimeType || "unknown"}).` };
    }
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_JOB_MEDIA_FILE_BYTES) {
      return { ok: false, error: `${originalName}: file must be 2 MB or smaller.` };
    }
    const expectedPrefix = `data:${mimeType};base64,`;
    if (!fileData.startsWith(expectedPrefix)) {
      return { ok: false, error: `${originalName}: upload data is invalid.` };
    }
    try {
      const bytes = Buffer.from(fileData.slice(expectedPrefix.length), "base64");
      if (bytes.length !== sizeBytes) {
        return { ok: false, error: `${originalName}: upload size does not match file data.` };
      }
    } catch {
      return { ok: false, error: `${originalName}: upload data could not be decoded.` };
    }

    totalBytes += sizeBytes;
    if (totalBytes > MAX_JOB_MEDIA_TOTAL_BYTES) {
      return { ok: false, error: "Total upload size must be 2.5 MB or smaller." };
    }
    media.push({ originalName, mimeType, sizeBytes, fileData });
  }

  return { ok: true, media, totalBytes };
}

export function publicMediaRecord(row: JobMedia) {
  return {
    id: row.id,
    url: `/api/media/${row.id}`,
    mimeType: row.mimeType,
    mediaType: row.mediaType,
    originalName: row.originalName,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

export async function getJobMediaForJob(jobId: number) {
  const rows = await db.select().from(jobMedia).where(eq(jobMedia.jobId, jobId)).orderBy(jobMedia.createdAt);
  return rows.map(publicMediaRecord);
}

/**
 * A provider may view media only when the job has actually been broadcast
 * to them or they have submitted/own the accepted quote. Customers may view
 * only their own job media. Founder/Admin may view for support/disputes.
 */
export async function canViewJobMedia(job: Job): Promise<boolean> {
  const admin = await getAdminSession();
  if (admin && (admin.role === "owner" || admin.role === "admin")) return true;

  const customer = await getCustomerSession();
  if (customer && (job.customerId === customer.id || job.customerEmail.toLowerCase() === customer.email.toLowerCase())) {
    return true;
  }

  const provider = await getProviderSession();
  if (!provider) return false;

  const [broadcast] = await db
    .select({ id: broadcasts.id })
    .from(broadcasts)
    .where(and(eq(broadcasts.jobId, job.id), eq(broadcasts.providerId, provider.id)))
    .limit(1);
  if (broadcast) return true;

  const [quote] = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.jobId, job.id), eq(quotes.providerId, provider.id)))
    .limit(1);
  if (quote) return true;

  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.jobId, job.id), eq(payments.providerId, provider.id)))
    .limit(1);
  return Boolean(payment);
}

export async function loadAuthorizedMedia(mediaId: number) {
  const [media] = await db.select().from(jobMedia).where(eq(jobMedia.id, mediaId)).limit(1);
  if (!media) return { status: 404 as const, error: "Media not found." };

  const [job] = await db.select().from(jobs).where(eq(jobs.id, media.jobId)).limit(1);
  if (!job) return { status: 404 as const, error: "Job not found." };

  if (!(await canViewJobMedia(job))) {
    const anySession = (await getAdminSession()) || (await getCustomerSession()) || (await getProviderSession());
    return { status: anySession ? (403 as const) : (401 as const), error: "You are not authorized to view this media." };
  }

  const prefix = `data:${media.mimeType};base64,`;
  if (!media.fileData.startsWith(prefix)) return { status: 500 as const, error: "Stored media is invalid." };

  return { status: 200 as const, media, bytes: Buffer.from(media.fileData.slice(prefix.length), "base64") };
}
