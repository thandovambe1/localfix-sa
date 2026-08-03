"use client";

import { useState } from "react";

export default function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setState("error");
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 max-w-sm">
      <label
        className={`block text-xs font-bold uppercase tracking-[0.16em] ${
          dark ? "text-slate-400" : "label"
        }`}
        htmlFor="newsletter-email"
      >
        Home maintenance tips &amp; promo codes
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setState("idle");
          }}
          placeholder="you@example.co.za"
          className={
            dark
              ? "w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm text-white transition placeholder:text-slate-500 focus:border-[#35c9c0] focus:outline-none focus:ring-4 focus:ring-[#35c9c0]/15"
              : "input"
          }
          autoComplete="email"
        />
        <button
          type="submit"
          className={`btn ${dark ? "btn-accent" : "btn-primary"} !px-5`}
          disabled={state === "loading"}
        >
          {state === "loading" ? "…" : "Join"}
        </button>
      </div>
      {state === "done" ? (
        <p className={`mt-2 text-xs font-semibold ${dark ? "text-[#5fd6cd]" : "text-good"}`}>
          You&apos;re on the list. Welcome to LocalFix SA!
        </p>
      ) : null}
      {state === "error" ? (
        <p className={`mt-2 text-xs font-semibold ${dark ? "text-[#f2a5a5]" : "text-bad"}`}>
          Please enter a valid email address.
        </p>
      ) : null}
    </form>
  );
}
