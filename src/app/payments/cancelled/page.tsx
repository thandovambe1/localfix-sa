import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; jobId?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="container-page py-16">
      <div className="card mx-auto max-w-lg p-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-50 text-4xl">⚠️</div>
        <h1 className="mt-6 text-2xl font-extrabold text-navy-800">Payment cancelled</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          You cancelled the payment. No charges have been made. You can return to the job and try again when you're ready.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {sp.jobId ? (
            <Link href={`/jobs/${sp.jobId}`} className="btn btn-accent">
              Return to job
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
