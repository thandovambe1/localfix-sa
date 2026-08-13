"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Decision = "approve" | "pending_docs" | "decline";

const OPTIONS: { key: Decision; label: string; icon: string; tone: string; hint: string }[] = [
  {
    key: "approve",
    label: "Approve",
    icon: "✅",
    tone: "bg-emerald-50 text-good hover:bg-emerald-100",
    hint: "Activate the provider and start sending job broadcasts.",
  },
  {
    key: "pending_docs",
    label: "Pending Docs",
    icon: "📋",
    tone: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    hint: "Keep the application open — request missing or replacement documents.",
  },
  {
    key: "decline",
    label: "Decline",
    icon: "🚫",
    tone: "bg-red-50 text-bad hover:bg-red-100",
    hint: "Reject the application. The applicant is emailed with your reason.",
  },
];

export default function ApplicationDecisionPanel({
  providerId,
  currentStatus,
}: {
  providerId: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ emailSent: boolean; emailError?: string } | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!decision) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = (await res.json()) as { error?: string; emailSent?: boolean; emailError?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not record decision");
      setResult({ emailSent: Boolean(data.emailSent), emailError: data.emailError });
      setDecision(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record decision");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-navy-800">Record a decision</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
            currentStatus === "active"
              ? "bg-emerald-50 text-good"
              : currentStatus === "declined"
                ? "bg-red-50 text-bad"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {currentStatus === "pending_docs" ? "pending docs" : currentStatus}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        The applicant is notified by email immediately, whichever decision you choose.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setDecision(o.key)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              decision === o.key
                ? "border-teal-400 ring-2 ring-teal-200"
                : "border-slate-200 hover:border-teal-200"
            } ${o.tone}`}
          >
            <span className="block text-sm font-extrabold">
              {o.icon} {o.label}
            </span>
            <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-600">{o.hint}</span>
          </button>
        ))}
      </div>

      {decision ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="decision-note">
              Note to the applicant {decision === "approve" ? "(optional)" : "(recommended)"}
            </label>
            <textarea
              id="decision-note"
              className="input min-h-[84px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                decision === "pending_docs"
                  ? "e.g. Please upload a clearer copy of your public liability policy schedule."
                  : decision === "decline"
                    ? "e.g. Insurance cover has lapsed; please re-apply once renewed."
                    : "e.g. Welcome aboard — your profile is now live."
              }
            />
          </div>
          <button className="btn btn-accent w-full" disabled={busy} onClick={submit}>
            {busy ? "Recording & emailing…" : `Record “${OPTIONS.find((o) => o.key === decision)?.label}” and email applicant`}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}
      {result ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
            result.emailSent ? "bg-emerald-50 text-good" : "bg-amber-50 text-amber-700"
          }`}
        >
          {result.emailSent
            ? "✓ Decision recorded and the applicant has been emailed."
            : `✓ Decision recorded. Email not sent${result.emailError ? ` — ${result.emailError}` : ""}. Configure SMTP in Vercel to enable applicant emails.`}
        </p>
      ) : null}
    </div>
  );
}
