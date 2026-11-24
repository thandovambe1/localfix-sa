"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type WalletData = {
  ownerType: "customer" | "provider";
  balanceCents: number;
  summary: Record<string, number>;
  pendingWithdrawals: number;
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
  withdrawals: {
    id: number;
    reference: string;
    amountCents: number;
    bankName: string;
    accountNumber: string;
    status: string;
    payoutReference: string | null;
    createdAt: string;
    adminNotes: string;
  }[];
};

const PRESETS = [100, 250, 500, 1000, 2500];
const zar = (cents: number) => `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WalletPanel({ initialBalanceCents, accountLabel }: { initialBalanceCents?: number; accountLabel: string }) {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("250");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [holder, setHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountType, setAccountType] = useState("cheque");
  const [panel, setPanel] = useState<"topup" | "withdraw" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/wallet", { credentials: "same-origin" });
    if (response.ok) setWallet((await response.json()) as WalletData);
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(load, 20000);
    return () => window.clearInterval(interval);
  }, []);

  async function topUp() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 50) return setError("Minimum deposit is R50.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/wallet/topup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { redirectUrl?: string; error?: string }) : {};
      if (!response.ok || !data.redirectUrl) throw new Error(data.error ?? "Could not start deposit.");
      window.location.href = data.redirectUrl;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start deposit.");
      setBusy(false);
    }
  }

  async function withdraw() {
    const value = Number(withdrawAmount);
    if (!Number.isFinite(value) || value < 50) return setError("Minimum withdrawal is R50.");
    if (!bankName || !holder || !/^\d{6,12}$/.test(accountNumber)) return setError("Complete valid bank details.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, bankName, accountHolder: holder, accountNumber, branchCode, accountType }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Withdrawal request failed.");
      setPanel(null);
      setWithdrawAmount("");
      await load();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Withdrawal request failed.");
    } finally {
      setBusy(false);
    }
  }

  const balance = wallet?.balanceCents ?? initialBalanceCents ?? 0;
  const summary = wallet?.summary ?? {};

  return (
    <section className="card overflow-hidden" id="wallet">
      <div className="bg-gradient-to-br from-navy-50 via-white to-teal-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{accountLabel} wallet</p>
        <p className="mt-2 text-4xl font-extrabold text-navy-800">{zar(balance)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="Deposits" value={zar(Number(summary.deposits ?? 0))} />
          <Mini label="Withdrawals" value={zar(Number(summary.withdrawals ?? 0))} />
          <Mini label="Pending" value={zar(wallet?.pendingWithdrawals ?? 0)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setPanel(panel === "topup" ? null : "topup")} className="btn btn-accent !px-4 !py-2 text-sm">
            {panel === "topup" ? "Close" : "Add money"}
          </button>
          <button type="button" onClick={() => setPanel(panel === "withdraw" ? null : "withdraw")} className="btn btn-ghost !px-4 !py-2 text-sm" disabled={balance < 5000}>
            Withdraw money
          </button>
        </div>
      </div>

      {panel === "topup" ? (
        <div className="space-y-3 border-t border-slate-100 p-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset} type="button" onClick={() => setAmount(String(preset))} className={`rounded-full px-3 py-1.5 text-xs font-bold ${amount === String(preset) ? "bg-teal-600 text-white" : "bg-mist text-slate-600"}`}>
                R{preset.toLocaleString("en-ZA")}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input" type="number" min={50} max={100000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Deposit amount in rand" />
            <button type="button" onClick={topUp} disabled={busy} className="btn btn-primary whitespace-nowrap">{busy ? "Opening…" : "Top up"}</button>
          </div>
          <p className="text-[11px] text-slate-500">Your balance updates only after Yoco confirms the verified payment webhook.</p>
        </div>
      ) : null}

      {panel === "withdraw" ? (
        <div className="space-y-3 border-t border-slate-100 p-5">
          <input className="input" type="number" min={50} max={100000} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Withdrawal amount (R)" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={bankName} onChange={(e) => setBankName(e.target.value)}><option value="">Select bank</option>{["Absa","Capitec","Discovery Bank","FNB","Nedbank","Standard Bank","TymeBank","African Bank","Investec","Other"].map((b) => <option key={b}>{b}</option>)}</select>
            <select className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)}><option value="cheque">Cheque / Current</option><option value="savings">Savings</option><option value="transmission">Transmission</option></select>
          </div>
          <input className="input" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Account holder" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} placeholder="Account number" />
            <input className="input" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="Branch code (optional)" />
          </div>
          <button type="button" onClick={withdraw} disabled={busy} className="btn btn-primary w-full">{busy ? "Requesting…" : "Request withdrawal"}</button>
        </div>
      ) : null}

      {error ? <p className="mx-5 mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p> : null}

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-navy-800">Transaction history</h3>
          <ul className="mt-3 space-y-2">
            {(wallet?.transactions ?? []).slice(0, 12).map((t) => (
              <li key={t.id} className="rounded-xl bg-mist px-3 py-2 text-xs">
                <div className="flex justify-between gap-2"><span className="font-bold text-navy-800">{t.description}</span><span className={t.amountCents >= 0 ? "font-bold text-good" : "font-bold text-navy-800"}>{t.amountCents >= 0 ? "+" : "−"}{zar(Math.abs(t.amountCents))}</span></div>
                <div className="mt-1 text-slate-500">{t.reference} · {new Date(t.createdAt).toLocaleString("en-ZA")} · {t.status}</div>
                {t.status !== "pending" ? <div className="text-slate-400">Balance after: {zar(t.balanceAfterCents)}</div> : null}
              </li>
            ))}
            {!wallet?.transactions.length ? <li className="text-xs text-slate-500">No transactions yet.</li> : null}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-navy-800">Withdrawals</h3>
          <ul className="mt-3 space-y-2">
            {(wallet?.withdrawals ?? []).slice(0, 8).map((w) => (
              <li key={w.id} className="rounded-xl bg-mist px-3 py-2 text-xs">
                <div className="flex justify-between gap-2"><span className="font-mono font-bold text-navy-800">{w.reference}</span><span className="font-bold">{w.status}</span></div>
                <p className="mt-1 font-bold text-navy-800">{zar(w.amountCents)}</p>
                <p className="text-slate-500">{w.bankName} · ••••{w.accountNumber.slice(-4)} · {new Date(w.createdAt).toLocaleDateString("en-ZA")}</p>
                {w.payoutReference ? <p className="text-good">Payout reference: {w.payoutReference}</p> : null}
                {w.adminNotes ? <p className="text-bad">{w.adminNotes}</p> : null}
              </li>
            ))}
            {!wallet?.withdrawals.length ? <li className="text-xs text-slate-500">No withdrawals requested.</li> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/80 px-2 py-2 ring-1 ring-black/[0.04]"><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="mt-0.5 truncate text-xs font-extrabold text-navy-800">{value}</p></div>;
}
