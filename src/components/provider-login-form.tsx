"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProviderLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/provider/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push("/dashboard/provider");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-7">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="provider-email">Business email</label>
          <input
            id="provider-email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="business@email.co.za"
          />
        </div>
        <div>
          <label className="label" htmlFor="provider-password">Password</label>
          <input
            id="provider-password"
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}

      <button className="btn btn-accent mt-6 w-full" disabled={busy}>
        {busy ? "Signing in…" : "Provider login"}
      </button>

      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        <Link href="/provider/forgot-password" className="font-semibold text-teal-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/become-a-provider" className="font-semibold text-navy-700 hover:underline">
          Register business
        </Link>
      </div>
    </form>
  );
}
