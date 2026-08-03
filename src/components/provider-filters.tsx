"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SERVICE_CATEGORIES } from "@/lib/services";
import { PROVINCES } from "@/lib/geo";

export default function ProviderFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/providers?${next.toString()}`);
  }

  return (
    <div className="card p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update("q", q);
        }}
        className="grid gap-3 md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="label" htmlFor="filter-q">
            Search
          </label>
          <input
            id="filter-q"
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Business name, service or suburb"
          />
        </div>
        <div>
          <label className="label" htmlFor="filter-cat">
            Service
          </label>
          <select id="filter-cat" className="input" value={sp.get("category") ?? ""} onChange={(e) => update("category", e.target.value)}>
            <option value="">All services</option>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-prov">
            Province
          </label>
          <select id="filter-prov" className="input" value={sp.get("province") ?? ""} onChange={(e) => update("province", e.target.value)}>
            <option value="">All provinces</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { key: "verifiedOnly", label: "✅ Verified only" },
          { key: "emergency", label: "🚨 Emergency available" },
        ].map((t) => {
          const active = sp.get(t.key) === "true";
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => update(t.key, active ? "" : "true")}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                active ? "bg-teal-500 text-white" : "bg-mist text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        {[4, 4.5, 4.8].map((r) => {
          const active = sp.get("minRating") === String(r);
          return (
            <button
              key={r}
              type="button"
              onClick={() => update("minRating", active ? "" : String(r))}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                active ? "bg-navy-600 text-white" : "bg-mist text-slate-600 hover:bg-slate-200"
              }`}
            >
              ★ {r}+
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => router.push("/providers")}
          className="ml-auto text-xs font-semibold text-slate-500 hover:text-teal-600"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
