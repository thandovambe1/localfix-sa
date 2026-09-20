"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Suggested top-up amounts in rands (client-safe copy). */
const TOPUP_PRESETS = [250, 500, 1000, 2500, 5000];

function zar(cents: number) {
  return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parse a JSON API response defensively. Never throws a raw JS exception
 * at the user — empty bodies, HTML error pages and network glitches all
 * become friendly, actionable messages.
 */
async function readJsonBody<T extends Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!text) {
    throw new Error(
      res.status === 401
        ? "Your session expired. Please sign in again."
        : "LocalFix did not respond. Please try again in a moment.",
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    if (res.status === 401) throw new Error("Your session expired. Please sign in again.");
    throw new Error("LocalFix returned an unexpected response. Please try again.");
  }
}

function friendlyHttpError(status: number): string {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "LocalFix is having trouble right now. Please try again in a moment.";
  return "Could not start top-up. Please try again.";
}

export function WalletCard({ balanceCents }: { balanceCents: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<null | "topup" | "withdraw">(null);

  const [wdAmount, setWdAmount] = useState<string>("");
  const [wdBank, setWdBank] = useState("");
  const [wdHolder, setWdHolder] = useState("");
  const [wdAccount, setWdAccount] = useState("");
  const [wdBranch, setWdBranch] = useState("");
  const [wdType, setWdType] = useState("cheque");

  async function topUp() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 50) {
      setError("Minimum top-up is R50.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let res: Response;
      try {
        res = await fetch("/api/wallet/topup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: value }),
        });
      } catch {
        throw new Error("Could not reach LocalFix. Check your connection and try again.");
      }
      const data = await readJsonBody<{ redirectUrl?: string; error?: string }>(res);
      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.error || friendlyHttpError(res.status));
      }
      window.location.href = data.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong starting your top-up.");
      setBusy(false);
    }
  }

  /**
   * After returning from Yoco (?topup=success&reference=...), poll our own
   * ledger until the webhook credits the wallet, then refresh the balance.
   */
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("topup") !== "success") return;
    const referenceParam = params.get("reference");
    if (!referenceParam) return;
    const reference: string = referenceParam;

    let cancelled = false;
    let attempts = 0;
    setVerifying("Confirming your payment with Yoco…");

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/wallet/topup/status?reference=${encodeURIComponent(reference)}`);
        const data = await readJsonBody<{ credited?: boolean; status?: string; error?: string }>(res);
        if (data.credited) {
          setVerifying(null);
          router.refresh();
          return;
        }
      } catch {
        /* keep polling — transient errors are expected during redirect */
      }
      if (attempts >= 15) {
        setVerifying(
          "Your payment is still being confirmed. Your balance will update automatically — you can refresh this page in a moment.",
        );
        return;
      }
      setTimeout(poll, 2000);
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withdraw() {
    const value = Number(wdAmount);
    if (!Number.isFinite(value) || value < 50) return setError("Minimum withdrawal is R50.");
    if (value * 100 > balanceCents) return setError(`You only have ${zar(balanceCents)} available.`);
    if (!wdBank || !wdHolder || !/^\d{6,12}$/.test(wdAccount.replace(/\s+/g, ""))) {
      return setError("Fill in the bank, account holder and a valid account number.");
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          bankName: wdBank,
          accountHolder: wdHolder,
          accountNumber: wdAccount,
          branchCode: wdBranch,
          accountType: wdType,
        }),
      });
      const data = await readJsonBody<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Could not request withdrawal");
      setPanel(null);
      setWdAmount("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="wallet" className="card overflow-hidden">
      <div className="relative bg-gradient-to-br from-navy-50 via-white to-teal-50 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-100 blur-3xl opacity-60" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Rainy-day wallet</p>
            <span className="text-2xl" aria-hidden>
              👛
            </span>
          </div>
          <p className="mt-3 text-4xl font-extrabold tracking-tight text-navy-800">{zar(balanceCents)}</p>
          <p className="mt-1 text-xs text-slate-600">
            Available to spend instantly on any job — no card needed at checkout.
          </p>
          {verifying ? (
            <p className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700" role="status">
              ⏳ {verifying}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setError("");
                setPanel((v) => (v === "topup" ? null : "topup"));
              }}
              className="btn btn-accent !px-5 !py-2.5 text-sm"
            >
              {panel === "topup" ? "Close" : "＋ Load money"}
            </button>
            <button
              onClick={() => {
                setError("");
                setPanel((v) => (v === "withdraw" ? null : "withdraw"));
              }}
              disabled={balanceCents < 5000}
              className="btn btn-ghost !px-5 !py-2.5 text-sm disabled:opacity-50"
              title={balanceCents < 5000 ? "You need at least R50 to withdraw" : ""}
            >
              {panel === "withdraw" ? "Close" : "↓ Withdraw"}
            </button>
          </div>
        </div>
      </div>

      {panel === "topup" ? (
        <div className="animate-fade-up border-t border-slate-100 p-6">
          <label className="label" htmlFor="topup-amount">
            How much would you like to load?
          </label>
          <div className="flex flex-wrap gap-2">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  amount === String(preset)
                    ? "bg-teal-600 text-white"
                    : "bg-mist text-slate-600 hover:bg-slate-200"
                }`}
              >
                R{preset.toLocaleString("en-ZA")}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              id="topup-amount"
              type="number"
              min={50}
              step={50}
              className="input"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              placeholder="Custom amount"
            />
            <button onClick={topUp} disabled={busy} className="btn btn-primary !px-5 whitespace-nowrap">
              {busy ? "Opening…" : "Top up"}
            </button>
          </div>

          {error ? <p className="mt-3 text-xs font-semibold text-bad">{error}</p> : null}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            🔒 Secured by Yoco. Funds stay in your LocalFix wallet until you approve a quote. Minimum R50.
          </p>
        </div>
      ) : null}

      {panel === "withdraw" ? (
        <div className="animate-fade-up space-y-3 border-t border-slate-100 p-6">
          <div>
            <label className="label" htmlFor="wd-amount">
              Withdrawal amount (min R50)
            </label>
            <input
              id="wd-amount"
              type="number"
              min={50}
              step={50}
              className="input"
              value={wdAmount}
              onChange={(e) => {
                setWdAmount(e.target.value);
                setError("");
              }}
              placeholder={`Up to ${zar(balanceCents)}`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="wd-bank">
                Bank
              </label>
              <select id="wd-bank" className="input" value={wdBank} onChange={(e) => setWdBank(e.target.value)}>
                <option value="">Select your bank</option>
                {["Absa", "Capitec", "Discovery Bank", "FNB", "Nedbank", "Standard Bank", "TymeBank", "African Bank", "Investec", "Other"].map(
                  (b) => (
                    <option key={b}>{b}</option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wd-type">
                Account type
              </label>
              <select id="wd-type" className="input" value={wdType} onChange={(e) => setWdType(e.target.value)}>
                <option value="cheque">Cheque / Current</option>
                <option value="savings">Savings</option>
                <option value="transmission">Transmission</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="wd-holder">
              Account holder name
            </label>
            <input
              id="wd-holder"
              className="input"
              value={wdHolder}
              onChange={(e) => setWdHolder(e.target.value)}
              placeholder="As it appears on the bank account"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="wd-account">
                Account number
              </label>
              <input
                id="wd-account"
                className="input"
                value={wdAccount}
                onChange={(e) => setWdAccount(e.target.value.replace(/\D/g, ""))}
                placeholder="Digits only"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label" htmlFor="wd-branch">
                Branch code <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="wd-branch"
                className="input"
                value={wdBranch}
                onChange={(e) => setWdBranch(e.target.value)}
                placeholder="e.g. 632005"
              />
            </div>
          </div>

          {error ? <p className="text-xs font-semibold text-bad">{error}</p> : null}

          <button onClick={withdraw} disabled={busy} className="btn btn-primary w-full">
            {busy ? "Requesting…" : "Request withdrawal"}
          </button>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Withdrawals are released by our finance team within 1–2 business days. The amount leaves your wallet
            immediately and is refunded if the request is declined.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function WithdrawalHistory({
  withdrawals: rows,
}: {
  withdrawals: {
    id: number;
    reference: string;
    amountCents: number;
    bankName: string;
    accountNumber: string;
    status: string;
    payoutReference: string | null;
    createdAt: string;
    processedAt: string | null;
    adminNotes: string;
  }[];
}) {
  if (!rows.length) return null;

  const tone: Record<string, string> = {
    requested: "bg-amber-50 text-amber-700",
    approved: "bg-navy-50 text-navy-700",
    processing: "bg-navy-50 text-navy-700",
    completed: "bg-emerald-50 text-good",
    rejected: "bg-red-50 text-bad",
    cancelled: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-navy-800">Withdrawal history</h3>
      <ul className="mt-3 space-y-2.5">
        {rows.map((w) => (
          <li key={w.id} className="rounded-2xl bg-mist p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-navy-800">{w.reference}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${tone[w.status] ?? "bg-slate-100 text-slate-500"}`}>
                {w.status}
              </span>
            </div>
            <p className="mt-1 text-sm font-extrabold text-navy-800">{zar(w.amountCents)}</p>
            <p className="text-[11px] text-slate-500">
              {w.bankName} · ••{w.accountNumber.slice(-4)} · {new Date(w.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
            </p>
            {w.payoutReference ? (
              <p className="text-[11px] text-good">Paid out · ref {w.payoutReference}</p>
            ) : null}
            {w.status === "rejected" && w.adminNotes ? (
              <p className="mt-1 text-[11px] text-bad">Reason: {w.adminNotes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WalletHistory({
  transactions,
}: {
  transactions: {
    id: number;
    type: string;
    amountCents: number;
    balanceAfterCents: number;
    description: string;
    reference: string;
    status: string;
    createdAt: string;
  }[];
}) {
  const icons: Record<string, string> = {
    topup: "⬆️",
    payment: "🧰",
    refund: "↩️",
    bonus: "🎁",
    withdrawal: "🏦",
  };

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-navy-800">Wallet activity</h3>
      {transactions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No wallet activity yet. Load some money so you&apos;re covered when something breaks.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {transactions.map((t) => {
            const credit = t.amountCents >= 0;
            return (
              <li key={t.id} className="flex items-start gap-3 rounded-2xl bg-mist px-3 py-2.5">
                <span aria-hidden className="mt-0.5 text-sm">
                  {icons[t.type] ?? "•"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-800">{t.description}</span>
                  <span className="block text-[11px] text-slate-500">
                    {t.reference} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {t.status === "pending" ? " · pending" : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-sm font-extrabold ${credit ? "text-good" : "text-navy-800"}`}>
                    {credit ? "+" : "−"}
                    {zar(Math.abs(t.amountCents))}
                  </span>
                  {t.status !== "pending" ? (
                    <span className="block text-[10px] text-slate-400">bal {zar(t.balanceAfterCents)}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PayFromWalletButton({
  quoteId,
  totalCents,
  balanceCents,
  jobId,
}: {
  quoteId: number;
  totalCents: number;
  balanceCents: number;
  jobId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const enough = balanceCents >= totalCents;

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = (await res.json()) as { error?: string; payment?: { reference: string } };
      if (!res.ok) throw new Error(data.error ?? "Wallet payment failed");
      router.push(`/payments/success?reference=${data.payment?.reference ?? ""}&jobId=${jobId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet payment failed");
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={pay} disabled={busy || !enough} className="btn btn-primary w-full">
        {busy ? "Paying…" : `👛 Pay from wallet (${zar(balanceCents)})`}
      </button>
      {!enough ? (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Short by {zar(totalCents - balanceCents)} — top up your wallet or pay by card.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
