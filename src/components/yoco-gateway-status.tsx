"use client";

import { useEffect, useState } from "react";

type GatewayStatus = {
  gateway: string;
  configured: boolean;
  mode: "live" | "test" | "missing";
  keyPrefix: string | null;
  webhookConfigured: boolean;
  baseUrl: string | null;
  webhookUrl: string | null;
  checkoutEndpoint: string;
  checks: { label: string; ok: boolean; hint: string }[];
  error: string | null;
};

export default function YocoGatewayStatus() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/payments/gateway", { credentials: "same-origin" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as GatewayStatus & { error?: string };
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Could not load gateway status.");
        setStatus(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load gateway status."));
  }, []);

  if (error) {
    return (
      <div className="card border-red-200 p-5">
        <p className="text-sm font-bold text-bad">Yoco gateway: {error}</p>
      </div>
    );
  }

  if (!status) return <div className="card h-32 shimmer" />;

  const badge =
    status.mode === "live"
      ? "bg-emerald-50 text-good"
      : status.mode === "test"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-bad";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Payment gateway</p>
          <h3 className="mt-1 text-lg font-extrabold text-navy-800">
            Yoco{" "}
            <span className={`ml-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${badge}`}>
              {status.mode === "live" ? "● Live" : status.mode === "test" ? "● Test mode" : "● Not configured"}
            </span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {status.keyPrefix ? `Key ${status.keyPrefix} · ` : ""}
            {status.baseUrl ?? "No base URL"}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {status.checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
              check.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
            }`}
          >
            <span aria-hidden>{check.ok ? "✓" : "⚠"}</span>
            <span>
              <strong>{check.label}.</strong> {check.hint}
            </span>
          </li>
        ))}
      </ul>

      {status.webhookUrl ? (
        <p className="mt-3 break-all rounded-xl bg-mist px-3 py-2 font-mono text-[11px] text-slate-600">
          Webhook URL → {status.webhookUrl}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-slate-400">
        Secrets stay server-side. This panel never exposes your Yoco keys.
      </p>
    </div>
  );
}
