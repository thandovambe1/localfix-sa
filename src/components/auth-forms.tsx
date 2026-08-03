"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROVINCES, SA_CITIES } from "@/lib/geo";

export function CustomerLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sign in failed");
      router.push(next && next.startsWith("/") ? next : "/dashboard/customer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-7">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.co.za"
          />
        </div>
        <div>
          <label className="label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-accent mt-6 w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        <Link href="/forgot-password" className="font-semibold text-teal-700 hover:underline">
          Forgot password?
        </Link>
        <span className="text-slate-300" aria-hidden>|</span>
        <span className="text-slate-600">
          New to LocalFix?{" "}
          <Link href="/register" className="font-semibold text-teal-700 hover:underline">
            Create a free account
          </Link>
        </span>
      </div>
    </form>
  );
}

export function CustomerRegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    password: "",
    province: "Gauteng",
    city: "Johannesburg",
    suburb: "",
    address: "",
    contactMethod: "whatsapp",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const cities = SA_CITIES.filter((c) => c.province === form.province);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: `${form.firstName.trim()} ${form.surname.trim()}`.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      router.push("/dashboard/customer?welcome=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-7">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reg-first-name">
              First name <span className="text-bad">*</span>
            </label>
            <input
              id="reg-first-name"
              required
              autoComplete="given-name"
              className="input"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="First name"
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-surname">
              Surname <span className="text-bad">*</span>
            </label>
            <input
              id="reg-surname"
              required
              autoComplete="family-name"
              className="input"
              value={form.surname}
              onChange={(e) => set("surname", e.target.value)}
              placeholder="Surname"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reg-email">
              Email address <span className="text-bad">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.co.za"
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-phone">
              Cellphone number <span className="text-bad">*</span>
            </label>
            <input
              id="reg-phone"
              required
              autoComplete="tel"
              inputMode="tel"
              className="input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="082 000 0000"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="reg-password">
            Password *
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="input"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-bold text-navy-800">Primary property address</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Used for matching nearby professionals. We do not request ID copies or claims documents during account registration.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reg-province">
              Province <span className="text-bad">*</span>
            </label>
            <select
              id="reg-province"
              className="input"
              value={form.province}
              onChange={(e) => {
                const province = e.target.value;
                const first = SA_CITIES.find((c) => c.province === province);
                setForm((f) => ({ ...f, province, city: first?.city ?? f.city }));
              }}
            >
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="reg-city">
              City / town <span className="text-bad">*</span>
            </label>
            <select id="reg-city" required className="input" value={form.city} onChange={(e) => set("city", e.target.value)}>
              {cities.map((c) => (
                <option key={c.city}>{c.city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reg-suburb">
              Suburb <span className="text-bad">*</span>
            </label>
            <input
              id="reg-suburb"
              required
              className="input"
              value={form.suburb}
              onChange={(e) => set("suburb", e.target.value)}
              placeholder="Bryanston"
            />
          </div>
          <div>
            <label className="label" htmlFor="reg-address">
              Street address <span className="text-bad">*</span>
            </label>
            <input
              id="reg-address"
              required
              autoComplete="street-address"
              className="input"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="14 Culross Road"
            />
          </div>
        </div>

        <div>
          <span className="label">Preferred contact method <span className="text-bad">*</span></span>
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
                  form.contactMethod === o.v
                    ? "border-teal-400 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <span aria-hidden>{o.i}</span> {o.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-accent mt-6 w-full" disabled={busy}>
        {busy ? "Creating your account…" : "Create free account"}
      </button>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
        Free forever for customers. By registering you accept our Terms and POPIA-compliant privacy policy.
      </p>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
