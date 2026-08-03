"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_SEARCHES, SERVICE_CATEGORIES } from "@/lib/services";

type Suggestion = { slug: string; label: string; sub?: string; icon: string };

const INDEX: Suggestion[] = SERVICE_CATEGORIES.flatMap((c) => [
  { slug: c.slug, label: c.name, icon: c.icon, sub: c.tagline },
  ...c.items.map((i) => ({ slug: c.slug, label: i, icon: c.icon, sub: c.name })),
]);

export default function ServiceSearch({ destination = "/post-job" }: { destination?: "/post-job" }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDEX.filter((s) => s.label.toLowerCase().includes(q) || (s.sub ?? "").toLowerCase().includes(q)).slice(0, 7);
  }, [query]);

  function go(slug: string, label?: string) {
    const params = new URLSearchParams({ category: slug });
    if (label && destination === "/post-job") params.set("title", label);
    router.push(`${destination}?${params.toString()}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (results[0]) go(results[0].slug, results[0].label);
    // Providers are matched through jobs, not browsed — send unmatched
    // searches to the job form with the query as the job title.
    else router.push(`/post-job?title=${encodeURIComponent(query)}`);
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-[1.4rem] bg-white p-2 shadow-[var(--shadow-lift)] sm:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-3">
          <span aria-hidden className="text-lg">
            🔎
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="What do you need done today?"
            aria-label="What do you need done today?"
            className="w-full border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-400"
          />
        </div>
        <button type="submit" className="btn btn-accent sm:w-auto">
          Find pros
        </button>
      </form>

      {focused && results.length > 0 ? (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[var(--shadow-lift)]">
          {results.map((r, i) => (
            <li key={`${r.slug}-${r.label}-${i}`}>
              <button
                type="button"
                onMouseDown={() => go(r.slug, r.label)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <span aria-hidden className="text-lg">
                  {r.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy-800">{r.label}</span>
                  <span className="block truncate text-xs text-slate-500">{r.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Popular:</span>
        {POPULAR_SEARCHES.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => setQuery(term)}
            className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
