"use client";

import Link from "next/link";
import { useState } from "react";

type AccountType = "customer" | "provider";

export default function ForgotPasswordForm({ accountType }: { accountType: AccountType }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loginHref = accountType === "provider" ? "/provider/login" : "/login";

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send verification code");
      setMessage(data.message ?? "Verification code sent.");
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send verification code");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (newPassword !== confirm) {
      setBusy(false);
      setError("Passwords do not match.");
      return;
    }
    try {
      const res = await fetch("/api/auth/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType, code, newPassword }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not reset password");
      setMessage(data.message ?? "Password reset successfully.");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="card p-8 text-center">
        <span className="text-4xl" aria-hidden>
          ✅
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-navy-800">Password reset</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Link href={loginHref} className="btn btn-accent mt-6">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-800">
        ✉️ We send a 6-digit verification code to your registered email address. Enter the code below to create a
        new password.
      </div>

      {step === "request" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="reset-email">
              Registered email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={accountType === "provider" ? "business@email.co.za" : "you@example.co.za"}
            />
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}
          <button className="btn btn-accent w-full" disabled={busy}>
            {busy ? "Sending…" : "Send verification code"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Remembered it?{" "}
            <Link href={loginHref} className="font-semibold text-teal-700 hover:underline">
              Back to login
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-6 space-y-4">
          {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-good">{message}</p> : null}
          <div>
            <label className="label" htmlFor="reset-email-confirm">
              Registered email
            </label>
            <input
              id="reset-email-confirm"
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="reset-code">
              Verification code
            </label>
            <input
              id="reset-code"
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
            <label className="label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              className="input"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="input"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}
          <button className="btn btn-accent w-full" disabled={busy}>
            {busy ? "Resetting…" : "Reset password"}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => {
              setStep("request");
              setError("");
              setMessage("");
            }}
          >
            Request another code
          </button>
        </form>
      )}
    </div>
  );
}
