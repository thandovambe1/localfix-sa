"use client";

import { useState } from "react";

/**
 * Founder-only password change form.
 *
 * Requires the current password, a new password (minimum 12 characters)
 * and confirmation. The server verifies the current password against the
 * stored scrypt hash, then hashes the new password and saves it.
 *
 * Only rendered when the signed-in admin has role "owner".
 */
export default function FounderChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/password/change", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Password change failed.");
      }

      setSuccess(data.message ?? "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="text-lg font-extrabold text-navy-800">🔐 Founder — Change Password</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Change your password directly. You must enter your current password first. The new password is
        securely hashed and saved. Your email, role and account remain unchanged.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="founder-current-pw">
            Current password <span className="text-bad">*</span>
          </label>
          <input
            id="founder-current-pw"
            type={showPasswords ? "text" : "password"}
            required
            autoComplete="current-password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
          />
        </div>

        <div>
          <label className="label" htmlFor="founder-new-pw">
            New password <span className="text-bad">*</span>
          </label>
          <input
            id="founder-new-pw"
            type={showPasswords ? "text" : "password"}
            required
            minLength={12}
            autoComplete="new-password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 12 characters"
          />
        </div>

        <div>
          <label className="label" htmlFor="founder-confirm-pw">
            Confirm new password <span className="text-bad">*</span>
          </label>
          <input
            id="founder-confirm-pw"
            type={showPasswords ? "text" : "password"}
            required
            minLength={12}
            autoComplete="new-password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="h-4 w-4 accent-teal-600"
          />
          Show passwords
        </label>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-bad" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-good" role="status">
            {success}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>
          {busy ? "Changing password…" : "Change Password"}
        </button>
      </form>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Your password is hashed with scrypt before storage. It is never logged, returned in a response,
        or stored in plaintext. Only the Founder (role: owner) can access this function.
      </p>
    </section>
  );
}
