"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Suggested top-up amounts in rands (client-safe copy). */
const TOPUP_PRESETS = [250, 500, 1000, 2500, 5000];

function zar(cents: number) {
  return `R${(cents / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Safely read an API response.
 *
 * Some server errors can return an empty body or non-JSON content.
 * Calling response.json() directly would then throw:
 *
 * "Unexpected end of JSON input"
 *
 * We read the response as text first and only parse JSON when there
 * is actually something to parse.
 */
async function readApiResponse<T>(
  res: Response,
): Promise<T> {
  const raw = await res.text();

  if (!raw.trim()) {
    console.error(
      "[LocalFix API] Empty response",
      {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
      },
    );

    if (!res.ok) {
      throw new Error(
        `The server returned an empty response (${res.status}). Please try again.`,
      );
    }

    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(
      "[LocalFix API] Invalid JSON response",
      {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        responsePreview: raw.slice(0, 500),
        error,
      },
    );

    throw new Error(
      "The server returned an invalid response. Please try again.",
    );
  }
}

export function WalletCard({
  balanceCents,
}: {
  balanceCents: number;
}) {
  const router = useRouter();

  const [amount, setAmount] = useState<string>("500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<null | "topup" | "withdraw">(
    null,
  );

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

    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: value,
        }),
      });

      const data = await readApiResponse<{
        redirectUrl?: string;
        error?: string;
        message?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(
          data.error ??
            data.message ??
            `Could not start top-up (${res.status})`,
        );
      }

      if (!data.redirectUrl) {
        console.error(
          "[WalletCard] Top-up API did not return redirectUrl",
          data,
        );

        throw new Error(
          data.error ??
            "The payment gateway did not return a checkout link. Please try again.",
        );
      }

      /*
       * Redirect the customer to Yoco's hosted checkout page.
       */
      window.location.href = data.redirectUrl;
    } catch (e) {
      console.error("[WalletCard] Top-up failed:", e);

      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong while starting the top-up.",
      );

      setBusy(false);
    }
  }

  async function withdraw() {
    const value = Number(wdAmount);

    if (!Number.isFinite(value) || value < 50) {
      setError("Minimum withdrawal is R50.");
      return;
    }

    if (value * 100 > balanceCents) {
      setError(
        `You only have ${zar(balanceCents)} available.`,
      );
      return;
    }

    if (
      !wdBank ||
      !wdHolder ||
      !/^\d{6,12}$/.test(wdAccount.replace(/\s+/g, ""))
    ) {
      setError(
        "Fill in the bank, account holder and a valid account number.",
      );
      return;
    }

    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: value,
          bankName: wdBank,
          accountHolder: wdHolder,
          accountNumber: wdAccount,
          branchCode: wdBranch,
          accountType: wdType,
        }),
      });

      const data = await readApiResponse<{
        error?: string;
        message?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(
          data.error ??
            data.message ??
            `Could not request withdrawal (${res.status})`,
        );
      }

      setPanel(null);
      setWdAmount("");
      setError("");

      router.refresh();
    } catch (e) {
      console.error(
        "[WalletCard] Withdrawal failed:",
        e,
      );

      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong while requesting the withdrawal.",
      );
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Rainy-day wallet
            </p>

            <span className="text-2xl" aria-hidden>
              👛
            </span>
          </div>

          <p className="mt-3 text-4xl font-extrabold tracking-tight text-navy-800">
            {zar(balanceCents)}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Available to spend instantly on any job — no card needed at
            checkout.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setPanel((v) =>
                  v === "topup" ? null : "topup",
                );
              }}
              disabled={busy}
              className="btn btn-accent !px-5 !py-2.5 text-sm disabled:opacity-50"
            >
              {panel === "topup"
                ? "Close"
                : "＋ Load money"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setPanel((v) =>
                  v === "withdraw" ? null : "withdraw",
                );
              }}
              disabled={balanceCents < 5000 || busy}
              className="btn btn-ghost !px-5 !py-2.5 text-sm disabled:opacity-50"
              title={
                balanceCents < 5000
                  ? "You need at least R50 to withdraw"
                  : ""
              }
            >
              {panel === "withdraw"
                ? "Close"
                : "↓ Withdraw"}
            </button>
          </div>
        </div>
      </div>

      {panel === "topup" ? (
        <div className="animate-fade-up border-t border-slate-100 p-6">
          <label
            className="label"
            htmlFor="topup-amount"
          >
            How much would you like to load?
          </label>

          <div className="flex flex-wrap gap-2">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={busy}
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  amount === String(preset)
                    ? "bg-teal-600 text-white"
                    : "bg-mist text-slate-600 hover:bg-slate-200"
                } disabled:opacity-50`}
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
              disabled={busy}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              placeholder="Custom amount"
            />

            <button
              type="button"
              onClick={topUp}
              disabled={busy}
              className="btn btn-primary !px-5 whitespace-nowrap"
            >
              {busy ? "Opening…" : "Top up"}
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 text-xs font-semibold text-bad"
            >
              {error}
            </p>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            🔒 Secured by Yoco. Funds stay in your LocalFix wallet
            until you approve a quote. Minimum R50.
          </p>
        </div>
      ) : null}

      {panel === "withdraw" ? (
        <div className="animate-fade-up space-y-3 border-t border-slate-100 p-6">
          <div>
            <label
              className="label"
              htmlFor="wd-amount"
            >
              Withdrawal amount (min R50)
            </label>

            <input
              id="wd-amount"
              type="number"
              min={50}
              step={50}
              className="input"
              value={wdAmount}
              disabled={busy}
              onChange={(e) => {
                setWdAmount(e.target.value);
                setError("");
              }}
              placeholder={`Up to ${zar(balanceCents)}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="label"
                htmlFor="wd-bank"
              >
                Bank
              </label>

              <select
                id="wd-bank"
                className="input"
                value={wdBank}
                disabled={busy}
                onChange={(e) =>
                  setWdBank(e.target.value)
                }
              >
                <option value="">
                  Select your bank
                </option>

                {[
                  "Absa",
                  "Capitec",
                  "Discovery Bank",
                  "FNB",
                  "Nedbank",
                  "Standard Bank",
                  "TymeBank",
                  "African Bank",
                  "Investec",
                  "Other",
                ].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="label"
                htmlFor="wd-type"
              >
                Account type
              </label>

              <select
                id="wd-type"
                className="input"
                value={wdType}
                disabled={busy}
                onChange={(e) =>
                  setWdType(e.target.value)
                }
              >
                <option value="cheque">
                  Cheque / Current
                </option>

                <option value="savings">
                  Savings
                </option>

                <option value="transmission">
                  Transmission
                </option>
              </select>
            </div>
          </div>

          <div>
            <label
              className="label"
              htmlFor="wd-holder"
            >
              Account holder name
            </label>

            <input
              id="wd-holder"
              className="input"
              value={wdHolder}
              disabled={busy}
              onChange={(e) =>
                setWdHolder(e.target.value)
              }
              placeholder="As it appears on the bank account"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="label"
                htmlFor="wd-account"
              >
                Account number
              </label>

              <input
                id="wd-account"
                className="input"
                value={wdAccount}
                disabled={busy}
                onChange={(e) =>
                  setWdAccount(
                    e.target.value.replace(/\D/g, ""),
                  )
                }
                placeholder="Digits only"
                inputMode="numeric"
              />
            </div>

            <div>
              <label
                className="label"
                htmlFor="wd-branch"
              >
                Branch code{" "}
                <span className="text-slate-400">
                  (optional)
                </span>
              </label>

              <input
                id="wd-branch"
                className="input"
                value={wdBranch}
                disabled={busy}
                onChange={(e) =>
                  setWdBranch(e.target.value)
                }
                placeholder="e.g. 632005"
              />
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="text-xs font-semibold text-bad"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={withdraw}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy
              ? "Requesting…"
              : "Request withdrawal"}
          </button>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Withdrawals are released by our finance team within
            1–2 business days. The amount leaves your wallet
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
      <h3 className="text-sm font-bold text-navy-800">
        Withdrawal history
      </h3>

      <ul className="mt-3 space-y-2.5">
        {rows.map((w) => (
          <li
            key={w.id}
            className="rounded-2xl bg-mist p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold text-navy-800">
                {w.reference}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  tone[w.status] ??
                  "bg-slate-100 text-slate-500"
                }`}
              >
                {w.status}
              </span>
            </div>

            <p className="mt-1 text-sm font-extrabold text-navy-800">
              {zar(w.amountCents)}
            </p>

            <p className="text-[11px] text-slate-500">
              {w.bankName} · ••{w.accountNumber.slice(-4)} ·{" "}
              {new Date(w.createdAt).toLocaleDateString(
                "en-ZA",
                {
                  day: "numeric",
                  month: "short",
                },
              )}
            </p>

            {w.payoutReference ? (
              <p className="text-[11px] text-good">
                Paid out · ref {w.payoutReference}
              </p>
            ) : null}

            {w.status === "rejected" &&
            w.adminNotes ? (
              <p className="mt-1 text-[11px] text-bad">
                Reason: {w.adminNotes}
              </p>
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
      <h3 className="text-sm font-bold text-navy-800">
        Wallet activity
      </h3>

      {transactions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No wallet activity yet. Load some money so you&apos;re
          covered when something breaks.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {transactions.map((t) => {
            const credit = t.amountCents >= 0;

            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-2xl bg-mist px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="mt-0.5 text-sm"
                >
                  {icons[t.type] ?? "•"}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-800">
                    {t.description}
                  </span>

                  <span className="block text-[11px] text-slate-500">
                    {t.reference} ·{" "}
                    {new Date(
                      t.createdAt,
                    ).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}

                    {t.status === "pending"
                      ? " · pending"
                      : ""}
                  </span>
                </span>

                <span className="text-right">
                  <span
                    className={`block text-sm font-extrabold ${
                      credit
                        ? "text-good"
                        : "text-navy-800"
                    }`}
                  >
                    {credit ? "+" : "−"}
                    {zar(Math.abs(t.amountCents))}
                  </span>

                  {t.status !== "pending" ? (
                    <span className="block text-[10px] text-slate-400">
                      bal {zar(t.balanceAfterCents)}
                    </span>
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
    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/wallet/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId,
        }),
      });

      const data = await readApiResponse<{
        error?: string;
        message?: string;
        payment?: {
          reference: string;
        };
      }>(res);

      if (!res.ok) {
        throw new Error(
          data.error ??
            data.message ??
            `Wallet payment failed (${res.status})`,
        );
      }

      const reference =
        data.payment?.reference ?? "";

      router.push(
        `/payments/success?reference=${encodeURIComponent(
          reference,
        )}&jobId=${encodeURIComponent(String(jobId))}`,
      );

      router.refresh();
    } catch (e) {
      console.error(
        "[WalletCard] Wallet payment failed:",
        e,
      );

      setError(
        e instanceof Error
          ? e.message
          : "Wallet payment failed",
      );

      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy || !enough}
        className="btn btn-primary w-full"
      >
        {busy
          ? "Paying…"
          : `👛 Pay from wallet (${zar(balanceCents)})`}
      </button>

      {!enough ? (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Short by {zar(totalCents - balanceCents)} — top up
          your wallet or pay by card.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs font-semibold text-bad"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
