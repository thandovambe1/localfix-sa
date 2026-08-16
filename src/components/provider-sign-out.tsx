"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SignOutIcon from "@/components/sign-out-icon";

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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-navy-800">Sign out?</span>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="btn btn-signout !px-4 !py-2 text-sm"
        >
          <SignOutIcon />
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
      className="btn btn-signout !px-4 !py-2 text-sm"
    >
      <SignOutIcon />
      Sign Out
    </button>
  );
}
