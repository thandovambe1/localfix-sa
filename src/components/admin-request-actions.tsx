"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminPasswordChangeForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not request code");
      setMessage(data.message ?? "Code sent to founder.");
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request code");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (newPassword !== confirm) {
      setBusy(false);
      setError("Passwords do not match.");
      return;
    }
    try {
      const res = await fetch("/api/admin/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not change password");
      setMessage(data.message ?? "Password changed successfully.");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="card p-8 text-center">
        <span className="text-4xl" aria-hidden>✅</span>
        <h2 className="mt-4 text-xl font-extrabold text-navy-800">Password changed</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Link href="/admin/login" className="btn btn-accent mt-6">
          Go to admin login
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
        🔐 Password changes require a 6-digit verification code sent to <strong>founder@localfix.co.za</strong>.
        Ask the founder for the code before completing step 2.
      </div>

      {step === "request" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="admin-email-change">Admin email</label>
            <input
              id="admin-email-change"
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@localfix.co.za"
            />
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}
          <button className="btn btn-accent w-full" disabled={busy}>
            {busy ? "Sending code…" : "Send verification code to founder"}
          </button>
        </form>
      ) : (
        <form onSubmit={changePassword} className="mt-6 space-y-4">
          {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-good">{message}</p> : null}
          <div>
            <label className="label" htmlFor="admin-email-confirm">Admin email</label>
            <input
              id="admin-email-confirm"
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="founder-code">Founder code</label>
            <input
              id="founder-code"
              className="input text-center font-mono text-lg tracking-[0.4em]"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </div>
          <div>
            <label className="label" htmlFor="new-admin-password">New password</label>
            <input
              id="new-admin-password"
              type="password"
              className="input"
              minLength={12}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 12 characters"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-admin-password">Confirm new password</label>
            <input
              id="confirm-admin-password"
              type="password"
              className="input"
              minLength={12}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}
          <button className="btn btn-accent w-full" disabled={busy}>
            {busy ? "Changing password…" : "Change password"}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => {
              setStep("request");
              setMessage("");
              setError("");
            }}
          >
            Request a different code
          </button>
        </form>
      )}
    </div>
  );
}
