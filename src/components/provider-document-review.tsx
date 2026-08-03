"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProviderDoc = {
  id: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: string;
  status: string;
  reviewedBy: string | null;
};

const LABELS: Record<string, string> = {
  id: "Owner ID",
  cipc: "CIPC registration",
  insurance_schedule: "Insurance policy schedule",
  proof_of_address: "Proof of address",
  bank_confirmation: "Bank confirmation",
  trade_certificate: "Trade certificate / licence",
};

export default function ProviderDocumentReview({ providerId }: { providerId: number }) {
  const router = useRouter();
  const [documents, setDocuments] = useState<ProviderDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/admin/providers/${providerId}/documents`)
      .then(async (res) => {
        const data = (await res.json()) as { documents?: ProviderDoc[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not load documents");
        setDocuments(data.documents ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load documents"))
      .finally(() => setLoaded(true));
  }, [providerId]);

  async function review(documentId: number, action: "approve" | "reject") {
    setBusy(documentId);
    setError("");
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action }),
      });
      const data = (await res.json()) as { document?: ProviderDoc; error?: string };
      if (!res.ok || !data.document) throw new Error(data.error ?? "Review failed");
      setDocuments((rows) => rows.map((row) => (row.id === documentId ? data.document! : row)));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) return <div className="mt-3 h-24 rounded-2xl shimmer" />;
  if (!documents.length) {
    return <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">No compliance documents uploaded.</p>;
  }

  return (
    <div className="mt-4 rounded-2xl border border-black/[0.05] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Compliance document review</p>
      <div className="mt-3 space-y-2">
        {documents.map((document) => (
          <div key={document.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-mist px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-navy-800">
                {LABELS[document.documentType] ?? document.documentType}
              </span>
              <span className="block truncate text-[10px] text-slate-500">
                {document.fileName} · {(document.sizeBytes / 1024).toFixed(0)} KB
              </span>
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                document.status === "approved"
                  ? "bg-emerald-50 text-good"
                  : document.status === "rejected"
                    ? "bg-red-50 text-bad"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {document.status}
            </span>
            <a
              href={document.fileData}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-navy-700 ring-1 ring-black/[0.06] hover:text-teal-700"
            >
              View
            </a>
            <button
              type="button"
              disabled={busy === document.id}
              onClick={() => review(document.id, "approve")}
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-good hover:bg-emerald-100 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy === document.id}
              onClick={() => review(document.id, "reject")}
              className="rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold text-bad hover:bg-red-100 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ))}
      </div>
      {error ? <p className="mt-2 text-[11px] font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
