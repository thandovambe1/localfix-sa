"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PayoutActions({
  paymentId,
  payoutStatus,
  paymentStatus,
  payoutAmount,
  canProcess,
}: {
  paymentId: number;
  payoutStatus: string;
  paymentStatus: string;
  payoutAmount: string;
  canProcess: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showRelease, setShowRelease] = useState(false);
  const [reference, setReference] = useState("");

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setShowRelease(false);
      setReference("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (!canProcess) {
    return <p className="text-[11px] italic text-slate-400">Your role cannot release funds</p>;
  }

  const settled = payoutStatus === "completed";
  const cleared = paymentStatus === "paid";

  if (settled) {
    return <span className="text-[11px] font-semibold text-good">✅ Funds released</span>;
  }

  if (paymentStatus === "refunded") {
    return <span className="text-[11px] font-semibold text-slate-500">↩️ Refunded to customer</span>;
  }

  return (
    <div className="w-full">
      {showRelease ? (
        <div className="rounded-2xl bg-mist p-3">
          <label className="label" htmlFor={`ref-${paymentId}`}>
            Bank / EFT reference
          </label>
          <input
            id={`ref-${paymentId}`}
            className="input !py-2 text-sm"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Auto-generated if blank"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            Releases <strong className="text-navy-800">{payoutAmount}</strong> to the provider and marks the job
            settled.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => act("complete", { reference })}
              disabled={busy !== null}
              className="btn btn-accent !px-4 !py-2 text-xs"
            >
              {busy === "complete" ? "Releasing…" : "Confirm release"}
            </button>
            <button onClick={() => setShowRelease(false)} className="btn btn-ghost !px-4 !py-2 text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {payoutStatus !== "processing" ? (
            <button
              onClick={() => act("approve")}
              disabled={busy !== null || !cleared}
              className="rounded-full bg-navy-50 px-3 py-1.5 text-[11px] font-bold text-navy-700 transition hover:bg-navy-100 disabled:opacity-40"
              title={cleared ? "" : "Customer payment has not cleared"}
            >
              {busy === "approve" ? "…" : "Approve"}
            </button>
          ) : null}
          <button
            onClick={() => setShowRelease(true)}
            disabled={busy !== null || !cleared}
            className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-good transition hover:bg-emerald-100 disabled:opacity-40"
            title={cleared ? "" : "Customer payment has not cleared"}
          >
            Release {payoutAmount}
          </button>
          <button
            onClick={() => act("hold")}
            disabled={busy !== null}
            className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
          >
            {busy === "hold" ? "…" : "Hold"}
          </button>
          <button
            onClick={() => act("refund")}
            disabled={busy !== null}
            className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-bad transition hover:bg-red-100 disabled:opacity-40"
          >
            {busy === "refund" ? "…" : "Refund"}
          </button>
        </div>
      )}

      {error ? <p className="mt-2 text-[11px] font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
