import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment failed", robots: { index: false } };

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; jobId?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="container-page py-16">
      <div className="card mx-auto max-w-lg p-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-50 text-4xl">❌</div>
        <h1 className="mt-6 text-2xl font-extrabold text-navy-800">Payment failed</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          We couldn't process your payment. Please check your card details and try again, or use a different payment method.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {sp.jobId ? (
            <Link href={`/jobs/${sp.jobId}`} className="btn btn-accent">
              Try again
            </Link>
          ) : null}
          <Link href="/dashboard/customer" className="btn btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
