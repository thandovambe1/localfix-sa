"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminRequestActions({ jobId, reference }: { jobId: number; reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/requests/${jobId}`, {
        method: "DELETE",
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete request");
      }

      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-xs font-semibold text-bad" role="alert">
          {error}
        </span>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={handleDelete}
        className={`btn text-xs !px-3.5 !py-1.5 font-bold transition-all duration-200 ${
          confirming
            ? "bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-300"
            : "btn-ghost !text-bad hover:bg-red-50"
        }`}
      >
        {busy ? "Deleting…" : confirming ? "⚠️ Confirm Delete?" : "🗑️ Delete"}
      </button>

      {confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs font-bold text-slate-500 hover:text-navy-700"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
