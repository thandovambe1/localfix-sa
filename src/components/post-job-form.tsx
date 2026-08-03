"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SERVICE_CATEGORIES, URGENCY_OPTIONS } from "@/lib/services";
import { PROVINCES, SA_CITIES } from "@/lib/geo";

type Ai = {
  categorySlug: string;
  categoryName: string;
  complexity: string;
  budgetLow: number;
  budgetHigh: number;
  suggestions: string[];
  confidence: number;
};

const STEPS = ["Service", "Job details", "Location & contact"];

export default function PostJobForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ai, setAi] = useState<Ai | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const [form, setForm] = useState({
    categorySlug: params.get("category") ?? "",
    title: params.get("title") ?? "",
    description: "",
    urgency: "this-week",
    budgetMin: "",
    budgetMax: "",
    preferredTimes: "",
    address: "",
    suburb: "",
    city: "Johannesburg",
    province: "Gauteng",
    contactMethod: "whatsapp",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const citiesForProvince = useMemo(
    () => SA_CITIES.filter((c) => c.province === form.province),
    [form.province],
  );

  useEffect(() => {
    if (citiesForProvince.length && !citiesForProvince.some((c) => c.city === form.city)) {
      set("city", citiesForProvince[0].city);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.province]);

  async function runAi() {
    if (!form.title && !form.description) return;
    try {
      const res = await fetch("/api/ai/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          categorySlug: form.categorySlug,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
          photos: photos.length,
          hasAddress: Boolean(form.address),
          hasTimes: Boolean(form.preferredTimes),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as Ai;
        setAi(data);
        if (!form.categorySlug) set("categorySlug", data.categorySlug);
      }
    } catch {
      /* AI assist is non-blocking */
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGps(null),
      { timeout: 8000 },
    );
  }

  const canNext =
    step === 0
      ? Boolean(form.categorySlug && form.title.trim().length > 3)
      : step === 1
        ? form.description.trim().length > 10
        : Boolean(form.customerName && form.customerEmail.includes("@"));

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
          photos,
          lat: gps?.lat,
          lng: gps?.lng,
        }),
      });
      if (!res.ok) throw new Error("Could not submit your request");
      const data = (await res.json()) as { job: { id: number }; matched: number };
      await new Promise((r) => setTimeout(r, 2600));
      router.push(`/jobs/${data.job.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (submitting) return <Dispatching city={form.city} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="card p-5 sm:p-8">
        <ol className="mb-7 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  i <= step ? "bg-navy-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {i + 1}
              </span>
              <span className={`hidden text-xs font-semibold sm:block ${i <= step ? "text-navy-700" : "text-slate-400"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 ? (
                <span className={`h-0.5 flex-1 rounded ${i < step ? "bg-navy-600" : "bg-slate-200"}`} />
              ) : null}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="animate-fade-up">
            <h2 className="text-lg font-bold text-navy-800">What do you need done?</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a category — our AI will confirm it from your description.</p>
            <div className="mt-5 grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {SERVICE_CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => set("categorySlug", c.slug)}
                  className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                    form.categorySlug === c.slug
                      ? "border-teal-400 bg-teal-50 shadow-[0_0_0_3px_rgba(15,158,153,0.12)]"
                      : "border-slate-200 bg-white hover:border-teal-200"
                  }`}
                >
                  <span className="text-xl" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-navy-800">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <label className="label" htmlFor="title">
                Job title
              </label>
              <input
                id="title"
                className="input"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Burst geyser flooding the ceiling"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="animate-fade-up space-y-5">
            <div>
              <label className="label" htmlFor="description">
                Describe the job
              </label>
              <textarea
                id="description"
                className="input min-h-[130px]"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                onBlur={runAi}
                placeholder="What is broken, where is it, how long has it been like this, and what have you already tried?"
              />
            </div>

            <div>
              <span className="label">Photos &amp; videos</span>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-5 transition hover:border-teal-300 hover:bg-teal-50/40">
                <span className="text-sm text-slate-600">
                  <span className="font-semibold text-navy-700">Tap to upload</span> — photos, videos or documents
                </span>
                <span className="text-xl" aria-hidden>
                  📸
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const names = Array.from(e.target.files ?? []).map((f) => f.name);
                    setPhotos((p) => [...p, ...names].slice(0, 8));
                  }}
                />
              </label>
              {photos.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <li key={`${p}-${i}`} className="chip">
                      🖼️ {p.length > 22 ? `${p.slice(0, 20)}…` : p}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <span className="label">How urgent is it?</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => set("urgency", u.value)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      form.urgency === u.value ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:border-teal-200"
                    }`}
                  >
                    <span aria-hidden>{u.icon}</span>
                    <span className="mt-1 block text-xs font-bold text-navy-800">{u.label}</span>
                    <span className="block text-[10px] text-slate-500">{u.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="budgetMin">
                  Budget from (R)
                </label>
                <input
                  id="budgetMin"
                  type="number"
                  min={0}
                  className="input"
                  value={form.budgetMin}
                  onChange={(e) => set("budgetMin", e.target.value)}
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="label" htmlFor="budgetMax">
                  Budget up to (R)
                </label>
                <input
                  id="budgetMax"
                  type="number"
                  min={0}
                  className="input"
                  value={form.budgetMax}
                  onChange={(e) => set("budgetMax", e.target.value)}
                  onBlur={runAi}
                  placeholder="8000"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="preferredTimes">
                Preferred appointment times
              </label>
              <input
                id="preferredTimes"
                className="input"
                value={form.preferredTimes}
                onChange={(e) => set("preferredTimes", e.target.value)}
                placeholder="Weekdays after 15:00, or Saturday morning"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="animate-fade-up space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="province">
                  Province
                </label>
                <select id="province" className="input" value={form.province} onChange={(e) => set("province", e.target.value)}>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="city">
                  City / town
                </label>
                <select id="city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)}>
                  {citiesForProvince.map((c) => (
                    <option key={c.city}>{c.city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="suburb">
                  Suburb
                </label>
                <input id="suburb" className="input" value={form.suburb} onChange={(e) => set("suburb", e.target.value)} placeholder="Bryanston" />
              </div>
              <div>
                <label className="label" htmlFor="address">
                  Street address
                </label>
                <input id="address" className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="14 Culross Road" />
              </div>
            </div>

            <button type="button" onClick={useMyLocation} className="btn btn-ghost w-full !py-3 text-sm">
              📍 {gps ? `GPS pinned (${gps.lat.toFixed(3)}, ${gps.lng.toFixed(3)})` : "Drop a GPS pin at my current location"}
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customerName">
                  Your name
                </label>
                <input id="customerName" className="input" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="customerPhone">
                  Mobile number
                </label>
                <input id="customerPhone" className="input" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="082 000 0000" />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="customerEmail">
                Email address
              </label>
              <input id="customerEmail" type="email" className="input" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} />
            </div>

            <div>
              <span className="label">Preferred contact method</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "phone", l: "Phone", i: "📞" },
                  { v: "whatsapp", l: "WhatsApp", i: "💬" },
                  { v: "email", l: "Email", i: "✉️" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set("contactMethod", o.v)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      form.contactMethod === o.v ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <span aria-hidden>{o.i}</span> {o.l}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              By submitting you agree to our Terms and POPIA-compliant privacy policy. Your exact address is only
              shared with the professional whose quote you accept.
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          {step < 2 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canNext}
              onClick={() => {
                if (step === 1) void runAi();
                setStep((s) => s + 1);
              }}
            >
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-accent" disabled={!canNext} onClick={submit}>
              Submit request
            </button>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-navy-800">
            <span aria-hidden>🤖</span> AI job assistant
          </h3>
          {ai ? (
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-slate-600">
                Categorised as <strong className="text-navy-800">{ai.categoryName}</strong> ({ai.confidence}% confidence) ·{" "}
                <span className="capitalize">{ai.complexity}</span>
              </p>
              <p className="rounded-xl bg-mist px-3 py-2 text-xs font-semibold text-navy-700">
                Suggested budget range: R{ai.budgetLow.toLocaleString("en-ZA")} – R{ai.budgetHigh.toLocaleString("en-ZA")}
              </p>
              {ai.suggestions.length ? (
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {ai.suggestions.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span aria-hidden>💡</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-semibold text-good">Your request looks complete. Nice work!</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Start describing your job and we&apos;ll auto-categorise it, estimate complexity and suggest a realistic
              budget range for South Africa.
            </p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-bold text-navy-800">What happens next</h3>
          <ol className="mt-3 space-y-3 text-sm text-slate-600">
            <li>1. We locate verified pros within 20–50 km of the job.</li>
            <li>2. They&apos;re notified instantly by push, email, SMS and WhatsApp.</li>
            <li>3. Quotes arrive in your dashboard, usually within the hour.</li>
            <li>4. You compare, chat and accept. Payment stays secure on-platform.</li>
          </ol>
        </div>

        <div className="card border-teal-200 bg-teal-50 p-6">
          <h3 className="text-sm font-bold text-navy-800">Emergency?</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Select <strong className="text-navy-800">Emergency</strong> urgency and we prioritise providers who are
            available 24/7 within 15 km.
          </p>
          <p className="mt-3 text-sm font-bold text-teal-700">☎️ 0800 LOCALFIX</p>
        </div>
      </aside>
    </div>
  );
}

function Dispatching({ city }: { city: string }) {
  const lines = [
    "Analysing your request with AI…",
    `Locating verified professionals near ${city}…`,
    "Checking insurance, qualifications and availability…",
    "Broadcasting your job by push, email, SMS and WhatsApp…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, lines.length - 1)), 650);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card grid place-items-center gap-6 p-12 text-center">
      <div className="relative grid h-32 w-32 place-items-center">
        <span className="absolute h-24 w-24 rounded-full bg-teal-200/60 pulse-ring" />
        <span className="absolute h-24 w-24 rounded-full bg-teal-300/50 pulse-ring [animation-delay:0.8s]" />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-navy-600 text-2xl text-white">📡</span>
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-navy-800">Finding nearby professionals…</h2>
        <p className="mt-2 text-sm text-slate-600">{lines[i]}</p>
      </div>
      <div className="w-full max-w-sm space-y-2">
        {[0, 1, 2].map((n) => (
          <div key={n} className="h-10 rounded-xl shimmer" />
        ))}
      </div>
    </div>
  );
}
