"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProviderWithdrawalActions({
  withdrawalId,
  status,
  amount,
}: {
  withdrawalId: number;
  status: string;
  amount: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  async function act(action: "approve" | "complete" | "reject") {
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/admin/provider-withdrawals/${withdrawalId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reference, notes }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Action failed");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  if (status === "completed") return <span className="text-xs font-semibold text-good">✅ Paid out</span>;
  if (status === "rejected") return <span className="text-xs font-semibold text-bad">Rejected & refunded</span>;

  return (
    <div className="space-y-2">
      {showComplete ? (
        <div className="rounded-xl bg-mist p-3">
          <input className="input !py-2 text-xs" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="EFT reference (optional)" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => act("complete")} disabled={Boolean(busy)} className="btn btn-accent !px-3 !py-1.5 text-xs">Confirm {amount} payout</button>
            <button type="button" onClick={() => setShowComplete(false)} className="btn btn-ghost !px-3 !py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      ) : showReject ? (
        <div className="rounded-xl bg-mist p-3">
          <input className="input !py-2 text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason shared internally" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => act("reject")} disabled={Boolean(busy)} className="btn !bg-red-50 !px-3 !py-1.5 text-xs !text-bad">Reject & refund</button>
            <button type="button" onClick={() => setShowReject(false)} className="btn btn-ghost !px-3 !py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {status === "requested" ? <button type="button" onClick={() => act("approve")} disabled={Boolean(busy)} className="btn btn-ghost !px-3 !py-1.5 text-xs">Approve</button> : null}
          <button type="button" onClick={() => setShowComplete(true)} className="btn btn-accent !px-3 !py-1.5 text-xs">Release payout</button>
          <button type="button" onClick={() => setShowReject(true)} className="btn !bg-red-50 !px-3 !py-1.5 text-xs !text-bad">Reject</button>
        </div>
      )}
      {error ? <p className="text-[11px] font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
