"use client";

import { useState } from "react";
import { COMMISSION_PERCENT } from "@/lib/commission";

type PaymentBreakdown = {
  totalCents: number;
  commissionCents: number;
  providerPayoutCents: number;
};

function zarFromCents(cents: number): string {
  const rands = cents / 100;
  return `R${rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CommissionBreakdown({
  quoteAmount,
  providerName,
}: {
  quoteAmount: number;
  providerName: string;
}) {
  const totalCents = Math.round(quoteAmount * 100);
  const commissionCents = Math.round(totalCents * 0.13);
  const payoutCents = totalCents - commissionCents;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-mist px-5 py-3">
        <h3 className="text-sm font-bold text-navy-800">💳 Payment breakdown</h3>
        <p className="text-xs text-slate-500">Payments are processed securely via Yoco</p>
      </div>
      <div className="space-y-3 p-5">
        <Row label="Quoted amount" value={zarFromCents(totalCents)} bold />
        <Row label={`Platform fee (${COMMISSION_PERCENT}%)`} value={zarFromCents(commissionCents)} tone="slate" />
        <div className="border-t border-slate-100 pt-3">
          <Row label={`Payout to ${providerName}`} value={zarFromCents(payoutCents)} bold tone="good" />
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          You pay the full quoted amount. LocalFix SA retains a {COMMISSION_PERCENT}% admin fee to cover platform
          operations, verification, dispute resolution and payment processing. The remaining{" "}
          {100 - COMMISSION_PERCENT}% is paid out to {providerName} within 3–5 business days.
        </p>
      </div>
    </div>
  );
}

export function PayButton({
  quoteId,
  quoteAmount,
  jobId,
  disabled,
}: {
  quoteId: number;
  quoteAmount: number;
  jobId: number;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [breakdown, setBreakdown] = useState<PaymentBreakdown | null>(null);

  async function initiatePayment() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = (await res.json()) as {
        redirectUrl?: string;
        payment?: PaymentBreakdown & { reference: string };
        breakdown?: { total: string; commission: string; payout: string };
        error?: string;
      };

      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.error ?? "Failed to create checkout");
      }

      if (data.payment) {
        setBreakdown({
          totalCents: data.payment.totalCents ?? 0,
          commissionCents: data.payment.commissionCents ?? 0,
          providerPayoutCents: data.payment.providerPayoutCents ?? 0,
        });
      }

      // Redirect to Yoco hosted checkout
      window.location.href = data.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const totalCents = Math.round(quoteAmount * 100);

  return (
    <div className="space-y-3">
      <button
        onClick={initiatePayment}
        disabled={busy || disabled}
        className="btn btn-accent w-full"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Creating secure checkout…
          </span>
        ) : (
          <>💳 Pay {zarFromCents(totalCents)} via Yoco</>
        )}
      </button>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-bad">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
        <span>🔒 256-bit SSL</span>
        <span>·</span>
        <span>PCI DSS compliant</span>
        <span>·</span>
        <span>Powered by Yoco</span>
      </div>
    </div>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", label: "⏳ Payment pending" },
    payment_pending: { bg: "bg-amber-50", text: "text-amber-700", label: "⏳ Awaiting payment" },
    paid: { bg: "bg-emerald-50", text: "text-good", label: "✅ Paid" },
    paid_out: { bg: "bg-emerald-50", text: "text-good", label: "✅ Paid & settled" },
    payout_pending: { bg: "bg-teal-50", text: "text-teal-700", label: "💰 Payout processing" },
    failed: { bg: "bg-red-50", text: "text-bad", label: "❌ Payment failed" },
    refunded: { bg: "bg-slate-100", text: "text-slate-600", label: "↩️ Refunded" },
    in_progress: { bg: "bg-teal-50", text: "text-teal-700", label: "🔧 In progress" },
  };

  const badge = map[status] ?? { bg: "bg-slate-100", text: "text-slate-600", label: status };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "slate" | "good";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${bold ? "font-semibold text-navy-800" : "text-slate-600"}`}>{label}</span>
      <span
        className={`text-sm ${
          bold ? "font-bold" : "font-semibold"
        } ${tone === "good" ? "text-good" : tone === "slate" ? "text-slate-500" : "text-navy-800"}`}
      >
        {value}
      </span>
    </div>
  );
}
