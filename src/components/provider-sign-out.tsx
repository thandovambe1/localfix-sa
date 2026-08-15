"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProviderSignOut() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/provider/auth/me", { method: "POST", credentials: "same-origin" });
    } catch {
      /* cookie cleared regardless */
    }
    router.push("/provider/login");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Sign out?</span>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="btn !bg-red-50 !px-4 !py-2 text-sm font-bold !text-bad ring-1 ring-red-200 hover:!bg-red-100"
        >
          {busy ? "Signing out…" : "Yes, sign out"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="btn btn-ghost !px-4 !py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="btn btn-ghost !px-4 !py-2 text-sm !text-bad hover:!bg-red-50"
    >
      Sign out
    </button>
  );
}
