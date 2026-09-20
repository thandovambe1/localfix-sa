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
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-50 text-4xl" aria-hidden>
          ❌
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-navy-800">Payment could not be completed</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Yoco was unable to complete the payment. This can happen if Apple Pay or Google Pay is unavailable for the
          card/device, the issuing bank declines the transaction, 3D Secure verification is interrupted, or the payment
          method is not supported.
        </p>

        <div className="mt-5 rounded-2xl bg-mist p-4 text-left text-sm text-slate-700">
          <p className="font-bold text-navy-800">Try one of these options:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Tap retry and choose a normal card payment instead of Apple Pay / Google Pay.</li>
            <li>Use a Visa or Mastercard and complete the bank verification step.</li>
            <li>Try Google Pay in Chrome/Android or Apple Pay in Safari/iOS on a supported card.</li>
            <li>Contact your bank if the payment is declined, or contact LocalFix support with your reference.</li>
          </ul>
          {sp.reference ? (
            <p className="mt-3 text-xs font-semibold text-slate-500">Reference: {sp.reference}</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {sp.jobId ? (
            <Link href={`/jobs/${sp.jobId}`} className="btn btn-accent">
              Retry payment
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
