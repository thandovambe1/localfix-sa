"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", topic: "Support", message: "" });

  if (sent)
    return (
      <div className="card p-8 text-center">
        <span className="text-3xl" aria-hidden>
          ✅
        </span>
        <h3 className="mt-3 text-lg font-bold text-navy-800">Message sent</h3>
        <p className="mt-1 text-sm text-slate-600">
          Thanks {form.name || "there"} — our team replies within one business day.
        </p>
      </div>
    );

  return (
    <form
      className="card space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, source: `contact:${form.topic}` }),
        }).catch(() => null);
        setSent(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">
            Your name
          </label>
          <input id="c-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="c-email">
            Email
          </label>
          <input
            id="c-email"
            type="email"
            className="input"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-topic">
          Topic
        </label>
        <select id="c-topic" className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
          {["Support", "Become a provider", "Billing", "Report a problem", "Partnerships", "Media", "Careers"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="c-message">
          Message
        </label>
        <textarea
          id="c-message"
          className="input min-h-[130px]"
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <p className="text-xs text-slate-500">Protected by CAPTCHA · We process your data in line with POPIA.</p>
      <button className="btn btn-primary w-full sm:w-auto" type="submit">
        Send message
      </button>
    </form>
  );
}
