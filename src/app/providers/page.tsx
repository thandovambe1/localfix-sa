import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "How professionals are matched",
  description:
    "LocalFix SA matches verified professionals to your job — providers are never browsed or contacted off-platform. Identities are revealed only after you accept a quote and payment clears.",
  robots: { index: true, follow: true },
};

export default function ProvidersExplainerPage() {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading
          eyebrow="Protected marketplace"
          title="We match professionals to your job — you don't browse them"
          subtitle="On LocalFix SA, all business happens on-platform. Posting a request broadcasts it to verified professionals near you; you compare anonymous quotes and the winning provider's identity is revealed only after payment clears."
        />
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/post-job" className="btn btn-accent">
            Request a Job
          </Link>
          <Link href="/how-it-works" className="btn btn-ghost">
            How matching works
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-3">
        {[
          {
            n: "1",
            icon: "📡",
            title: "Broadcast to verified pros",
            body: "Your job goes only to providers who are identity-checked, insured and active in your radius — never to a public directory.",
          },
          {
            n: "2",
            icon: "🎭",
            title: "Compare anonymous quotes",
            body: "See price, rating, distance, warranty and availability from Pro A, Pro B, Pro C. No business names, no off-platform contact.",
          },
          {
            n: "3",
            icon: "🔓",
            title: "Identity released on payment",
            body: "Accept a quote and pay securely. The provider's name, logo, phone and WhatsApp unlock immediately — and chat opens.",
          },
        ].map((s) => (
          <div key={s.n} className="card card-hover relative p-6 text-center">
            <span className="absolute right-5 top-5 text-4xl font-black text-navy-50">{s.n}</span>
            <span className="text-2xl" aria-hidden>
              {s.icon}
            </span>
            <h2 className="mt-3 text-base font-bold text-navy-800">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-2xl rounded-[1.6rem] border border-teal-200 bg-teal-50 p-6 text-center">
        <p className="text-sm font-bold text-teal-700">🛡️ Why we do this</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Keeping every agreement, message and payment on-platform protects you from no-shows, unverified operators
          and off-platform disputes — and it keeps quotes competitive. Providers who try to take business off-platform
          are suspended.
        </p>
      </div>

      <p className="mt-10 text-center text-sm text-slate-500">
        Are you a professional?{" "}
        <Link href="/become-a-provider" className="font-semibold text-teal-700 hover:underline">
          Join the verified network
        </Link>
      </p>
    </div>
  );
}
