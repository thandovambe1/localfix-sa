"use client";

import { useState } from "react";
import Link from "next/link";
import { SERVICE_CATEGORIES } from "@/lib/services";
import { PROVINCES, SA_CITIES } from "@/lib/geo";

type ComplianceDocument = {
  documentType: string;
  label: string;
  help: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileData: string;
};

const REQUIRED_DOCUMENTS = [
  {
    documentType: "id",
    label: "Owner ID document",
    help: "Clear copy of the business owner's South African ID or valid passport.",
  },
  {
    documentType: "cipc",
    label: "CIPC business registration",
    help: "Company registration certificate or current CIPC disclosure certificate.",
  },
  {
    documentType: "insurance_schedule",
    label: "Public liability insurance policy schedule",
    help: "Current policy schedule showing the insured business name and cover period.",
  },
  {
    documentType: "proof_of_address",
    label: "Business proof of address",
    help: "Utility bill, lease or bank statement dated within the last 3 months.",
  },
  {
    documentType: "bank_confirmation",
    label: "Bank account confirmation letter",
    help: "Recent bank-issued confirmation matching the business or owner name.",
  },
] as const;

const REGULATED_CATEGORIES = new Set([
  "plumbing",
  "electrical",
  "solar",
  "security",
  "air-conditioning",
  "pest-control",
  "builders",
]);

const LANGUAGES = ["English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho", "Setswana", "Sepedi", "Xitsonga", "Tshivenda", "siSwati"];

export type ProviderPlan = "free" | "pro" | "premium";

export const PLANS: {
  key: ProviderPlan;
  name: string;
  price: string;
  note: string;
  multiProvince: boolean;
  features: string[];
  popular?: boolean;
}[] = [
  {
    key: "free",
    name: "Starter",
    price: "R0",
    note: "forever · 1 province only",
    multiProvince: false,
    features: ["Single service province", "Up to 10 leads / month", "Verified profile & quotes", "Standard support"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "R399",
    note: "per month · multi-branch",
    multiProvince: true,
    popular: true,
    features: ["Multiple provinces / branches", "Unlimited job leads", "Business analytics", "Priority support"],
  },
  {
    key: "premium",
    name: "Premium",
    price: "R899",
    note: "per month · multi-branch",
    multiProvince: true,
    features: ["Everything in Pro", "Featured placement", "Account manager", "API access"],
  },
];

export default function ProviderSignupForm() {
  const [categories, setCategories] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [extraBranches, setExtraBranches] = useState<string[]>([]);
  const [plan, setPlan] = useState<ProviderPlan>("free");
  const [complianceDocs, setComplianceDocs] = useState<Record<string, ComplianceDocument>>({});
  const [documentError, setDocumentError] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoError, setLogoError] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    whatsapp: "",
    province: "Gauteng",
    city: "Johannesburg",
    suburb: "",
    address: "",
    serviceRadiusKm: "30",
    yearsExperience: "5",
    employees: "3",
    hourlyRate: "450",
    operatingHours: "Mon–Fri 08:00–17:00",
    website: "",
    bio: "",
    emergencyAvailable: false,
  });

  const serviceProvinces = [form.province, ...extraBranches.filter((p) => p !== form.province)];
  const multiProvince = serviceProvinces.length > 1;

  function onLogoFile(file: File | undefined) {
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > 250 * 1024) {
      setLogoError("Logo must be under 250 KB — or paste an image URL instead.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function onComplianceFile(documentType: string, label: string, file: File | undefined) {
    setDocumentError("");
    if (!file) return;
    const accepted = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!accepted.includes(file.type)) {
      setDocumentError(`${label}: upload a PDF, JPG, PNG or WebP file.`);
      return;
    }
    if (file.size > 500 * 1024) {
      setDocumentError(`${label}: file must be 500 KB or smaller. Compress the document and try again.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = String(reader.result ?? "");
      setComplianceDocs((current) => ({
        ...current,
        [documentType]: {
          documentType,
          label,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          fileData,
          help: "",
        },
      }));
    };
    reader.readAsDataURL(file);
  }

  const tradeCertificateRequired = categories.some((category) => REGULATED_CATEGORIES.has(category));
  const requiredDocumentTypes = [
    ...REQUIRED_DOCUMENTS.map((document) => document.documentType),
    ...(tradeCertificateRequired ? ["trade_certificate"] : []),
  ];
  const allRequiredDocumentsUploaded = requiredDocumentTypes.every((type) => Boolean(complianceDocs[type]));

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categories.length) {
      setStatus("error");
      setMessage("Select at least one service category.");
      return;
    }
    if (multiProvince && plan === "free") {
      setStatus("error");
      setMessage("Multiple provinces (branches) require a Pro or Premium plan.");
      return;
    }
    if (form.password.length < 8) {
      setStatus("error");
      setMessage("Create a provider password with at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setStatus("error");
      setMessage("Provider passwords do not match.");
      return;
    }
    if (!allRequiredDocumentsUploaded) {
      setStatus("error");
      setMessage("Upload every required compliance document marked with an asterisk before submitting.");
      return;
    }
    setStatus("saving");
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        logoUrl: logoUrl || null,
        serviceRadiusKm: Number(form.serviceRadiusKm),
        yearsExperience: Number(form.yearsExperience),
        employees: Number(form.employees),
        hourlyRate: Number(form.hourlyRate),
        categories,
        languages,
        provinces: serviceProvinces,
        plan,
        complianceDocuments: Object.values(complianceDocs),
      }),
    });
    if (res.ok) {
      setStatus("done");
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setMessage(data.error ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "done")
    return (
      <div className="card p-10 text-center">
        <span className="text-4xl" aria-hidden>
          🎉
        </span>
        <h2 className="mt-4 text-2xl font-extrabold text-navy-800">Welcome to LocalFix SA</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Your business is in the verification queue. Our Trust &amp; Safety team reviews documents within 24–48 hours.
          You&apos;ll get an email the moment you&apos;re activated and start receiving job broadcasts.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard/provider" className="btn btn-accent">
            Preview my dashboard
          </Link>
          <Link href="/pricing" className="btn btn-ghost">
            Compare plans
          </Link>
        </div>
      </div>
    );

  const cities = SA_CITIES.filter((c) => c.province === form.province);

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy-800">Business details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business name" required value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
          <Field label="Owner name" required value={form.ownerName} onChange={(v) => setForm({ ...form, ownerName: v })} />
          <Field label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Cellphone number" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="WhatsApp number" required value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
          <Field label="Website / social link" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="Provider password" type="password" required value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <Field label="Confirm provider password" type="password" required value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} />
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="bio">
            Short business bio
          </label>
          <textarea
            id="bio"
            className="input min-h-[100px]"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="What you specialise in, your accreditations and what makes your service different."
          />
        </div>

        <div className="mt-5">
          <span className="label">Business logo</span>
          <p className="mb-2 text-xs text-slate-500">
            Your logo appears on every quote you send to customers, on the official LocalFix template.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Business logo preview"
                className="h-16 w-16 rounded-2xl bg-white object-contain ring-1 ring-black/[0.08]"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-mist text-2xl" aria-hidden>
                🖼️
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <label className="btn btn-ghost !px-4 !py-2 text-xs">
                Upload logo (max 250 KB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
              </label>
              <input
                className="input !py-2 text-xs"
                placeholder="…or paste an image URL"
                value={logoUrl.startsWith("data:") ? "" : logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setLogoError("");
                }}
              />
              {logoError ? <p className="text-xs font-semibold text-bad">{logoError}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy-800">Location &amp; coverage</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="prov">
              Primary service province <span className="text-bad">*</span>
            </label>
            <select
              id="prov"
              className="input"
              value={form.province}
              onChange={(e) => {
                const next = e.target.value;
                setForm({
                  ...form,
                  province: next,
                  city: SA_CITIES.filter((c) => c.province === next)[0]?.city ?? "",
                });
                setExtraBranches((b) => b.filter((x) => x !== next));
              }}
            >
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">
              City <span className="text-bad">*</span>
            </label>
            <select id="city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
              {cities.map((c) => (
                <option key={c.city}>{c.city}</option>
              ))}
            </select>
          </div>
          <Field label="Suburb" required value={form.suburb} onChange={(v) => setForm({ ...form, suburb: v })} />
          <Field label="Business address" required value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="radius">
            Service radius: {form.serviceRadiusKm} km
          </label>
          <input
            id="radius"
            type="range"
            min={5}
            max={100}
            step={5}
            value={form.serviceRadiusKm}
            onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })}
            className="w-full accent-teal-500"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-black/[0.05] bg-mist p-4">
          <p className="label !mb-1">Additional branches (optional)</p>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            The free Starter plan covers <strong className="text-navy-700">one province only</strong>. Add extra
            branches if you service more than one province — this requires a Pro or Premium plan, chosen below.
          </p>
          <div className="flex flex-wrap gap-2">
            {PROVINCES.filter((p) => p !== form.province).map((p) => {
              const active = extraBranches.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setExtraBranches((b) => (active ? b.filter((x) => x !== p) : [...b, p]));
                    if (!active && plan === "free") setPlan("pro");
                  }}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    active ? "bg-navy-600 text-white" : "bg-white text-slate-600 ring-1 ring-black/[0.06] hover:bg-slate-100"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {p}
                </button>
              );
            })}
          </div>
          {multiProvince ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              🔀 {serviceProvinces.length} provinces selected — a paid plan (Pro or Premium) is required.
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold text-good">✓ Single province — eligible for the free Starter plan.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy-800">Membership plan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose how you want to grow. You can upgrade or downgrade at any time from your dashboard.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => {
            const disabled = !p.multiProvince && multiProvince;
            const active = plan === p.key;
            return (
              <button
                key={p.key}
                type="button"
                disabled={disabled}
                onClick={() => setPlan(p.key)}
                className={`relative flex flex-col rounded-2xl border p-4 text-left transition ${
                  disabled
                    ? "cursor-not-allowed border-slate-200 opacity-50"
                    : active
                      ? "border-teal-400 bg-teal-50 shadow-[0_0_0_3px_rgba(15,158,153,0.12)]"
                      : "border-slate-200 hover:-translate-y-0.5 hover:border-teal-300"
                }`}
              >
                {p.popular ? (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Popular
                  </span>
                ) : null}
                <span className="text-sm font-extrabold text-navy-800">{p.name}</span>
                <span className="mt-1 text-xl font-black text-navy-800">
                  {p.price}
                  <span className="ml-1 text-[11px] font-semibold text-slate-500">{p.note}</span>
                </span>
                <ul className="mt-3 space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-1.5 text-xs text-slate-600">
                      <span className="text-good" aria-hidden>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                {disabled ? (
                  <span className="mt-3 text-[11px] font-semibold text-amber-700">
                    Requires 1 province — upgrade for branches
                  </span>
                ) : active ? (
                  <span className="mt-3 text-[11px] font-bold text-teal-700">✓ Selected</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy-800">
          Services offered <span className="text-bad">*</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Select every category you want job broadcasts for. At least one is required.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SERVICE_CATEGORIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggle(categories, setCategories, c.slug)}
              className={`rounded-2xl border p-3 text-left text-xs font-bold transition hover:-translate-y-0.5 ${
                categories.includes(c.slug) ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-200 text-navy-800"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {c.icon}
              </span>
              <span className="mt-1 block">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy-800">Capability</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Years of experience" type="number" value={form.yearsExperience} onChange={(v) => setForm({ ...form, yearsExperience: v })} />
          <Field label="Number of employees" type="number" value={form.employees} onChange={(v) => setForm({ ...form, employees: v })} />
          <Field label="Call-out rate (R/hr)" type="number" value={form.hourlyRate} onChange={(v) => setForm({ ...form, hourlyRate: v })} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Operating hours" value={form.operatingHours} onChange={(v) => setForm({ ...form, operatingHours: v })} />
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-navy-800">
            <input
              type="checkbox"
              className="h-4 w-4 accent-teal-500"
              checked={form.emergencyAvailable}
              onChange={(e) => setForm({ ...form, emergencyAvailable: e.target.checked })}
            />
            Available for 24/7 emergency callouts
          </label>
        </div>

        <p className="label mt-4">Languages spoken</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Toggle key={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)} label={l} />
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold text-navy-800">Compliance documents</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Every document marked <span className="font-bold text-bad">*</span> is required before registration can be
          submitted. Files are private, encrypted in transit and visible only to authorised Trust &amp; Safety staff.
          Accepted formats: PDF, JPG, PNG or WebP (maximum 500 KB each).
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ...REQUIRED_DOCUMENTS,
            ...(tradeCertificateRequired
              ? [
                  {
                    documentType: "trade_certificate",
                    label: "Trade certificate / regulatory licence",
                    help: "Required for regulated services such as plumbing, electrical, solar, security, HVAC, pest control or building.",
                  },
                ]
              : []),
          ].map((document) => {
            const uploaded = complianceDocs[document.documentType];
            const inputId = `compliance-${document.documentType}`;
            return (
              <div
                key={document.documentType}
                className={`rounded-2xl border p-4 transition ${
                  uploaded ? "border-teal-300 bg-teal-50/60" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="text-sm font-bold text-navy-800" htmlFor={inputId}>
                      {document.label} <span className="text-bad">*</span>
                    </label>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{document.help}</p>
                  </div>
                  <span className={`text-lg ${uploaded ? "text-good" : "text-slate-300"}`} aria-hidden>
                    {uploaded ? "✓" : "○"}
                  </span>
                </div>

                <label
                  htmlFor={inputId}
                  className={`mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2.5 text-xs font-semibold transition ${
                    uploaded
                      ? "border-teal-300 bg-white text-teal-700"
                      : "border-slate-300 text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {uploaded ? uploaded.fileName : "Choose required document"}
                  </span>
                  <span aria-hidden>{uploaded ? "Replace" : "Upload"}</span>
                </label>
                <input
                  id={inputId}
                  type="file"
                  required={!uploaded}
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => onComplianceFile(document.documentType, document.label, e.target.files?.[0])}
                />
                {uploaded ? (
                  <p className="mt-2 text-[10px] text-slate-500">
                    {(uploaded.sizeBytes / 1024).toFixed(0)} KB · awaiting verification
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {documentError ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{documentError}</p>
        ) : null}

        <div className={`mt-4 rounded-xl px-4 py-3 text-xs font-semibold ${allRequiredDocumentsUploaded ? "bg-emerald-50 text-good" : "bg-amber-50 text-amber-700"}`}>
          {allRequiredDocumentsUploaded
            ? "✓ All required compliance documents uploaded."
            : `${requiredDocumentTypes.filter((type) => !complianceDocs[type]).length} required document${requiredDocumentTypes.filter((type) => !complianceDocs[type]).length === 1 ? "" : "s"} still missing.`}
        </div>
      </section>

      {status === "error" ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad">{message}</p> : null}

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button className="btn btn-accent w-full sm:w-auto" disabled={status === "saving"} type="submit">
          {status === "saving"
            ? "Submitting…"
            : plan === "free"
              ? "Submit free registration"
              : `Register on ${PLANS.find((p) => p.key === plan)?.name}`}
        </button>
        <p className="text-xs text-slate-500">
          {plan === "free"
            ? "Free forever to register. No credit card."
            : `Paid plans start after verification. ${serviceProvinces.length} province${serviceProvinces.length === 1 ? "" : "s"} covered.`}{" "}
          By registering you accept our Terms and POPIA privacy policy.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span className="text-bad"> *</span> : null}
      </label>
      <input id={id} type={type} className="input" required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
        active ? "bg-navy-600 text-white" : "bg-mist text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
