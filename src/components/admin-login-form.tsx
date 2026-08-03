"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm({ next }: { next?: string }) {
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
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-7">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="admin-email">
            Email address
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operations@yourcompany.co.za"
          />
        </div>
        <div>
          <label className="label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in securely"}
      </button>

      <p className="mt-4 text-center text-sm">
        <a href="/admin/change-password" className="font-semibold text-teal-700 hover:underline">
          Change password with founder code
        </a>
      </p>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
        🔒 Sessions expire after 8 hours. Every privileged action is written to the audit log.
      </p>
    </form>
  );
}
