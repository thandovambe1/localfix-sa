"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WithdrawalActions({
  id,
  status,
  amountLabel,
}: {
  id: number;
  status: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const done = status === "completed" || status === "rejected";

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setShowComplete(false);
      setShowReject(false);
      setReference("");
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <span className={`text-[11px] font-semibold ${status === "completed" ? "text-good" : "text-bad"}`}>
        {status === "completed" ? "✅ Paid out" : "❌ Declined & refunded"}
      </span>
    );
  }

  if (showComplete) {
    return (
      <div className="w-full rounded-2xl bg-mist p-3">
        <label className="label" htmlFor={`ref-${id}`}>
          EFT reference
        </label>
        <input
          id={`ref-${id}`}
          className="input !py-2 text-sm"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Auto-generated if blank"
        />
        <p className="mt-2 text-[11px] text-slate-500">Releases {amountLabel} to the customer's bank.</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => act("complete", { reference })}
            disabled={busy !== null}
            className="btn btn-accent !px-4 !py-2 text-xs"
          >
            {busy === "complete" ? "Releasing…" : "Confirm payout"}
          </button>
          <button onClick={() => setShowComplete(false)} className="btn btn-ghost !px-4 !py-2 text-xs">
            Cancel
          </button>
        </div>
        {error ? <p className="mt-2 text-[11px] font-semibold text-bad">{error}</p> : null}
      </div>
    );
  }

  if (showReject) {
    return (
      <div className="w-full rounded-2xl bg-mist p-3">
        <label className="label" htmlFor={`notes-${id}`}>
          Reason for rejection
        </label>
        <input
          id={`notes-${id}`}
          className="input !py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Shared with the customer"
        />
        <p className="mt-2 text-[11px] text-slate-500">Refunds {amountLabel} to the customer's wallet.</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => act("reject", { notes })}
            disabled={busy !== null}
            className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-bad transition hover:bg-red-100"
          >
            {busy === "reject" ? "Refunding…" : "Reject & refund"}
          </button>
          <button onClick={() => setShowReject(false)} className="btn btn-ghost !px-4 !py-2 text-xs">
            Cancel
          </button>
        </div>
        {error ? <p className="mt-2 text-[11px] font-semibold text-bad">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "requested" ? (
        <button
          onClick={() => act("approve")}
          disabled={busy !== null}
          className="rounded-full bg-navy-50 px-3 py-1.5 text-[11px] font-bold text-navy-700 transition hover:bg-navy-100"
        >
          {busy === "approve" ? "…" : "Approve"}
        </button>
      ) : null}
      <button
        onClick={() => setShowComplete(true)}
        disabled={busy !== null}
        className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-good transition hover:bg-emerald-100"
      >
        Release {amountLabel}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={busy !== null}
        className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-bad transition hover:bg-red-100"
      >
        Reject
      </button>
      {error ? <p className="mt-1 text-[11px] font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
