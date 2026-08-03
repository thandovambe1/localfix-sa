"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROVINCES } from "@/lib/geo";

const PLANS = [
  { key: "free", label: "Starter", hint: "1 province" },
  { key: "pro", label: "Pro", hint: "multi-branch" },
  { key: "premium", label: "Premium", hint: "multi-branch" },
] as const;

export default function ProviderOpsEditor({
  provider,
}: {
  provider: { id: number; businessName: string; plan: string; provinces: string[] };
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<string>(provider.plan);
  const [provinces, setProvinces] = useState<string[]>(provider.provinces?.length ? provider.provinces : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty = plan !== provider.plan || JSON.stringify(provinces) !== JSON.stringify(provider.provinces);
  const multi = provinces.length > 1;
  const freeBlocked = plan === "free" && multi;

  function toggleProvince(p: string) {
    setSaved(false);
    setProvinces((prev) => {
      if (prev.includes(p)) {
        const next = prev.filter((x) => x !== p);
        return next.length ? next : prev; // keep at least one
      }
      return [...prev, p];
    });
  }

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, provinces }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-black/[0.05] bg-mist p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Plan &amp; coverage (operations)</p>
        {saved ? <span className="text-[11px] font-bold text-good">✓ Saved</span> : null}
      </div>

      {/* Plan */}
      <div className="mt-2 flex flex-wrap gap-2">
        {PLANS.map((p) => {
          const disabled = p.key === "free" && multi;
          const active = plan === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSaved(false);
                setPlan(p.key);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                disabled
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : active
                    ? "bg-navy-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-black/[0.06] hover:bg-slate-100"
              }`}
              title={disabled ? "Free plan covers one province only" : ""}
            >
              {p.label}
              <span className="ml-1 font-medium opacity-70">· {p.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Provinces */}
      <p className="mt-3 text-[11px] font-semibold text-slate-500">
        Service provinces {plan === "free" ? "(Starter = 1 only)" : "(branches)"}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {PROVINCES.map((p) => {
          const active = provinces.includes(p);
          const blocked = plan === "free" && !active && provinces.length >= 1;
          return (
            <button
              key={p}
              type="button"
              disabled={blocked}
              onClick={() => {
                setSaved(false);
                toggleProvince(p);
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                blocked
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : active
                    ? "bg-teal-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-black/[0.06] hover:bg-slate-100"
              }`}
              title={blocked ? "Upgrade to a paid plan to add branches" : ""}
            >
              {p}
            </button>
          );
        })}
      </div>

      {freeBlocked ? (
        <p className="mt-2 text-[11px] font-semibold text-bad">
          Multiple provinces require a paid plan — switch to Pro or Premium, or remove branches.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[11px] font-semibold text-bad">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty || freeBlocked}
          className="btn btn-accent !px-4 !py-2 text-xs disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setPlan(provider.plan);
              setProvinces(provider.provinces);
              setError("");
            }}
            className="btn btn-ghost !px-4 !py-2 text-xs"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
