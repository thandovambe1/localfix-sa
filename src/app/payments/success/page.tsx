import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment successful", robots: { index: false } };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; jobId?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="container-page py-16">
      <div className="card mx-auto max-w-lg p-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-4xl">
          ✅
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-navy-800">Payment successful</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your payment has been processed securely via Yoco. The service provider has been notified and can now begin
          work. A 13% platform administration fee has been applied.
        </p>
        {sp.reference ? (
          <p className="mt-4 rounded-xl bg-mist px-3 py-2 text-sm font-mono font-semibold text-navy-700">
            Payment ref: {sp.reference}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {sp.jobId ? (
            <Link href={`/jobs/${sp.jobId}`} className="btn btn-accent">
              View job details
            </Link>
          ) : null}
          <Link href="/dashboard/customer" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          A receipt has been emailed to you. Downloadable invoices are available in your dashboard.
        </p>
      </div>
    </div>
  );
}
