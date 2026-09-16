"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteJobRequest({
  jobId,
  jobReference,
}: {
  jobId: number;
  jobReference: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteRequest() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "This request could not be deleted.");
      }

      router.push("/dashboard/customer");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This request could not be deleted.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn !border-red-200 !bg-red-50 !px-4 !py-2 text-sm font-bold !text-bad hover:!bg-red-100"
      >
        🗑 Delete request
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-extrabold text-bad">Delete {jobReference}?</p>
      <p className="mt-1 text-xs leading-relaxed text-red-900">
        You can delete this request only while no quotation has been accepted. This removes the request,
        broadcasts, submitted quotations, uploaded media and related messages. This action cannot be undone.
      </p>
      {error ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={deleteRequest}
          disabled={busy}
          className="btn !bg-red-700 !px-4 !py-2 text-sm font-bold !text-white hover:!bg-red-800 disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Yes, delete request"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
          className="btn btn-ghost !px-4 !py-2 text-sm"
        >
          Keep request
        </button>
      </div>
    </div>
  );
}
