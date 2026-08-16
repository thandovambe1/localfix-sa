"use client";

import { useMemo, useState } from "react";

type JobMedia = {
  id: number;
  url: string;
  mimeType: string;
  mediaType: string;
  originalName?: string;
  sizeBytes?: number;
};

function isImage(media: JobMedia) {
  return media.mimeType.startsWith("image/");
}
function isVideo(media: JobMedia) {
  return media.mimeType.startsWith("video/");
}
function fileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaGallery({ media, title = "Photos & Videos From Customer" }: { media: JobMedia[]; title?: string }) {
  const [active, setActive] = useState<JobMedia | null>(null);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const ordered = useMemo(() => [...media].sort((a, b) => a.id - b.id), [media]);

  if (!ordered.length) {
    return (
      <div className="rounded-2xl bg-mist p-5 text-center text-sm text-slate-500">
        No photos or videos were uploaded for this job.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="chip">{ordered.length} attachment{ordered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((item) => {
          const label = item.originalName || `${item.mediaType} ${item.id}`;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/25"
              aria-label={`Open ${label}`}
            >
              <div className="aspect-[4/3] bg-mist">
                {broken[item.id] ? (
                  <div className="grid h-full place-items-center px-3 text-center text-xs font-semibold text-slate-500">
                    Unable to load this media.
                  </div>
                ) : isImage(item) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={label}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    onError={() => setBroken((s) => ({ ...s, [item.id]: true }))}
                  />
                ) : isVideo(item) ? (
                  <div className="relative h-full w-full bg-navy-900">
                    <video
                      src={item.url}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover opacity-80"
                      onError={() => setBroken((s) => ({ ...s, [item.id]: true }))}
                    />
                    <span className="absolute inset-0 grid place-items-center text-3xl text-white" aria-hidden>
                      ▶
                    </span>
                  </div>
                ) : (
                  <div className="grid h-full place-items-center text-2xl" aria-hidden>
                    📎
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate text-xs font-semibold text-navy-800">{label}</span>
                <span className="shrink-0 text-[10px] text-slate-400">{fileSize(item.sizeBytes)}</span>
              </div>
              {isVideo(item) ? (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Video
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-900/80 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={active.originalName ?? "Media viewer"}
          onClick={() => setActive(null)}
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <p className="min-w-0 truncate text-sm font-bold">{active.originalName ?? "Attachment"}</p>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-navy-800 transition hover:bg-teal-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[82vh] overflow-hidden rounded-2xl bg-black shadow-2xl">
              {isImage(active) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.url} alt={active.originalName ?? "Uploaded image"} className="max-h-[82vh] w-full object-contain" />
              ) : isVideo(active) ? (
                <video controls preload="metadata" playsInline className="max-h-[82vh] w-full bg-black">
                  <source src={active.url} type={active.mimeType} />
                  Your browser cannot play this video format.
                </video>
              ) : (
                <div className="p-12 text-center text-white">Unsupported media type.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
