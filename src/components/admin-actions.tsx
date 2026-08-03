"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminActions({ providerId, status }: { providerId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: "active" | "pending" | "suspended") {
    setBusy(true);
    await fetch(`/api/providers/${providerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => set("active")}
        disabled={busy || status === "active"}
        className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-good transition hover:bg-emerald-100 disabled:opacity-40"
      >
        Approve
      </button>
      <button
        onClick={() => set("pending")}
        disabled={busy || status === "pending"}
        className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
      >
        Re-review
      </button>
      <button
        onClick={() => set("suspended")}
        disabled={busy || status === "suspended"}
        className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-bad transition hover:bg-red-100 disabled:opacity-40"
      >
        Suspend
      </button>
    </div>
  );
}
