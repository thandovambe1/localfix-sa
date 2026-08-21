"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Blockers = {
  activeJobs?: { id: number; reference: string; status: string }[];
  unsettledPayments?: { id: number; reference: string; status: string; payoutStatus: string }[];
  unlockedJobCards?: { id: number; documentReference: string; status: string }[];
};

export default function FounderDeleteProvider({
  providerId,
  businessName,
}: {
  providerId: number;
  businessName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blockers, setBlockers] = useState<Blockers | null>(null);

  const exactMatch = confirmation === businessName;

  async function removeProvider() {
    if (!exactMatch) {
      setError("Type the exact business name to confirm permanent deletion.");
      return;
    }

    setBusy(true);
    setError("");
    setBlockers(null);
    try {
      const response = await fetch(`/api/admin/providers/${providerId}/delete`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmBusinessName: confirmation }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        blockers?: Blockers;
      };
      if (!response.ok) {
        setBlockers(data.blockers ?? null);
        throw new Error(data.error ?? "Provider could not be deleted.");
      }

      router.push("/admin/providers");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Provider could not be deleted.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn w-full !bg-red-50 !text-bad ring-1 ring-red-200 hover:!bg-red-100"
      >
        🗑 Permanently Delete Provider
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <h3 className="text-sm font-extrabold text-bad">Danger zone — permanent provider deletion</h3>
      <p className="mt-2 text-xs leading-relaxed text-red-900">
        This removes the provider login, profile, compliance documents, broadcasts, reviews and non-historical
        quote/message data. Completed signed Job Cards and settled financial records are retained only as detached
        immutable audit records. This action cannot be undone.
      </p>

      <label className="label mt-4" htmlFor={`delete-provider-${providerId}`}>
        Type <strong>{businessName}</strong> to confirm
      </label>
      <input
        id={`delete-provider-${providerId}`}
        className="input border-red-200 focus:border-red-400 focus:ring-red-100"
        value={confirmation}
        onChange={(event) => {
          setConfirmation(event.target.value);
          setError("");
          setBlockers(null);
        }}
        autoComplete="off"
      />

      {error ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}

      {blockers ? (
        <div className="mt-3 rounded-xl bg-white p-3 text-xs text-red-900">
          <p className="font-bold">Resolve these obligations first:</p>
          <ul className="mt-2 space-y-1">
            {(blockers.activeJobs ?? []).map((item) => (
              <li key={`job-${item.id}`}>• Job {item.reference} — {item.status}</li>
            ))}
            {(blockers.unsettledPayments ?? []).map((item) => (
              <li key={`payment-${item.id}`}>• Payment {item.reference} — {item.status} / payout {item.payoutStatus}</li>
            ))}
            {(blockers.unlockedJobCards ?? []).map((item) => (
              <li key={`card-${item.id}`}>• Job Card {item.documentReference} — {item.status}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={removeProvider}
          disabled={busy || !exactMatch}
          className="btn !bg-red-700 !px-4 !py-2 text-sm font-bold !text-white hover:!bg-red-800 disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Confirm Permanent Deletion"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
            setError("");
            setBlockers(null);
          }}
          className="btn btn-ghost !px-4 !py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
