"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function Countdown({ deadline }: { deadline: string | null }) {
  const [left, setLeft] = useState<string>("—");
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) return setLeft("Closed");
      const h = Math.floor(ms / 3600_000);
      const m = Math.floor((ms % 3600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLeft(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  return (
    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700" aria-live="polite">
      ⏳ Quotes close in {left}
    </span>
  );
}

export function QuoteActions({ quoteId, disabled }: { quoteId: number; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  async function act(action: "accept" | "decline") {
    setBusy(action);
    await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button className="btn btn-accent !px-4 !py-2 text-sm" disabled={disabled || busy !== null} onClick={() => act("accept")}>
        {busy === "accept" ? "Accepting…" : "Accept quote"}
      </button>
      <button className="btn btn-ghost !px-4 !py-2 text-sm" disabled={disabled || busy !== null} onClick={() => act("decline")}>
        Decline
      </button>
    </div>
  );
}

type ChatMessage = { id: number; sender: string; authorName: string; body: string; createdAt: string };

export function JobChat({
  jobId,
  initial,
  sender = "customer",
  authorName = "You",
  providerId,
}: {
  jobId: number;
  initial: ChatMessage[];
  sender?: "customer" | "provider";
  authorName?: string;
  providerId?: number | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setTyping(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, body, sender, authorName, providerId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { message: ChatMessage };
      setMessages((m) => [...m, data.message]);
    }
    setTyping(false);
  }

  async function summarise() {
    const res = await fetch(`/api/messages?jobId=${jobId}`);
    if (res.ok) {
      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
    }
  }

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-navy-800">Secure in-platform chat</h3>
        <button type="button" onClick={summarise} className="text-xs font-semibold text-teal-600 hover:underline">
          🤖 AI summary
        </button>
      </div>
      {summary ? <p className="mt-2 rounded-xl bg-mist px-3 py-2 text-xs text-slate-600">{summary}</p> : null}

      <div className="mt-4 max-h-80 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Say hello and confirm access times.</p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === sender ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.sender === sender ? "bg-navy-600 text-white" : "bg-mist text-slate-700"
              }`}
            >
              <p className="text-[11px] font-semibold opacity-70">{m.authorName}</p>
              <p className="mt-0.5 leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}
        {typing ? <p className="text-xs italic text-slate-400">Sending…</p> : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-4 flex items-center gap-2">
        <div className="flex gap-1 text-lg" aria-hidden>
          <button type="button" title="Attach photo" className="transition hover:scale-110">
            📎
          </button>
          <button type="button" title="Voice note" className="transition hover:scale-110">
            🎙️
          </button>
          <button type="button" title="Share location" className="transition hover:scale-110">
            📍
          </button>
        </div>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <button className="btn btn-primary !px-4 !py-2.5 text-sm" type="submit">
          Send
        </button>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">
        Messages are encrypted and monitored for fraud. Read receipts ✓✓ · Typing indicators enabled.
      </p>
    </div>
  );
}

export function QuoteDocButton({
  label = "View quote document",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-teal-700 hover:underline">
        📄 {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navy-900/50 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="btn btn-ghost !bg-white !px-4 !py-2 text-sm shadow-lg"
                aria-label="Close"
              >
                ✕ Close
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function QuoteForm({ jobId, providerId }: { jobId: number; providerId: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("Within 48 hours");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setBusy(true);
    const res = await fetch(`/api/jobs/${jobId}/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, amount: Number(amount), message, availability }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setAmount("");
      setMessage("");
      router.refresh();
    }
  }

  if (done) return <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-good">Quote submitted ✓</p>;

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input
          className="input"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quote amount (R)"
          aria-label="Quote amount in rand"
        />
        <input
          className="input"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="Availability"
          aria-label="Availability"
        />
      </div>
      <textarea
        className="input min-h-[70px]"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's included: labour, materials, warranty…"
        aria-label="Quote details"
      />
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
        🔒 Quotes are anonymised until the customer pays. Do <strong>not</strong> include your business name, phone
        number, email or WhatsApp here — off-platform contact attempts can get your account suspended.
      </p>
      <button className="btn btn-accent w-full !py-2.5 text-sm" disabled={busy}>
        {busy ? "Submitting…" : "Submit quote"}
      </button>
    </form>
  );
}
