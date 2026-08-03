"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RequestPayout({
  paymentId,
  amount,
  payoutStatus,
}: {
  paymentId: number;
  amount: string;
  payoutStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (payoutStatus === "completed") {
    return <span className="text-[11px] font-semibold text-good">✅ Paid out</span>;
  }
  if (payoutStatus === "requested") {
    return <span className="text-[11px] font-semibold text-amber-700">🔔 Requested — under review</span>;
  }
  if (payoutStatus === "processing") {
    return <span className="text-[11px] font-semibold text-navy-700">⚙️ Approved — releasing soon</span>;
  }

  async function request() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={request} disabled={busy} className="btn btn-accent !px-4 !py-2 text-xs">
        {busy ? "Requesting…" : `Request ${amount}`}
      </button>
      {error ? <p className="mt-1 text-[11px] font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
