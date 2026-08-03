import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "See how LocalFix SA dispatches your job to verified local professionals in real time — choose a service, describe the job, get matched, compare quotes and accept.",
};

const STEPS = [
  {
    n: "01",
    icon: "🧭",
    title: "Choose a service",
    body: "Pick from 20+ trade categories or simply type the problem. Our AI categorises it, estimates complexity and suggests a realistic South African budget range.",
    detail: ["20+ categories, 100+ sub-services", "AI auto-categorisation", "Emergency routing for urgent jobs"],
  },
  {
    n: "02",
    icon: "📝",
    title: "Describe your job",
    body: "Add photos and videos, choose urgency, set a preferred date and budget, and drop a GPS pin at the property. It takes about two minutes.",
    detail: ["Photos, videos and documents", "Emergency / Today / This week / Flexible", "GPS pin and multiple saved properties"],
  },
  {
    n: "03",
    icon: "📡",
    title: "We broadcast instantly",
    body: "Verified professionals who offer that service, operate in your radius and are active on the platform get notified immediately by push, email, SMS and WhatsApp.",
    detail: ["Configurable 20–50 km radius", "Only verified, active providers", "Suburb-level privacy until you accept"],
  },
  {
    n: "04",
    icon: "✅",
    title: "Compare and accept",
    body: "Quotes land side by side with price, warranty, availability, ratings and portfolio. Chat in-platform, accept one, and pay securely.",
    detail: ["Quote countdown timer", "Compare price, rating and response time", "Secure payments and downloadable invoices"],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-white">
        <div className="container-page py-14 md:py-20">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title="From broken to booked in four steps"
            subtitle="No call centres. No chasing. No guesswork. LocalFix SA works like a dispatch system, not a directory."
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/post-job" className="btn btn-accent">
              Request a Job
            </Link>
            <Link href="/become-a-provider" className="btn btn-ghost">
              Become a Service Provider
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page space-y-6 py-14">
        {STEPS.map((s, i) => (
          <section key={s.n} className="card card-hover grid gap-6 p-7 md:grid-cols-[auto_1fr_1fr] md:items-center">
            <div className="flex items-center gap-4 md:flex-col md:items-start">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-2xl" aria-hidden>
                {s.icon}
              </span>
              <span className="text-3xl font-black text-navy-100">{s.n}</span>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-navy-800">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
            </div>
            <ul className="space-y-2">
              {s.detail.map((d) => (
                <li key={d} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm text-slate-700">
                  <span className="text-good" aria-hidden>
                    ✓
                  </span>
                  {d}
                </li>
              ))}
            </ul>
            {i === 2 ? (
              <div className="md:col-span-3">
                <div className="relative mt-2 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#eef2f9,#e8faf8)] p-6">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {["Push notification", "Email", "SMS", "WhatsApp"].map((ch) => (
                      <div key={ch} className="rounded-2xl bg-white/80 px-4 py-3 text-center text-sm font-semibold text-navy-700 shadow-sm">
                        {ch}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-500">
                    Each notification includes the job title, suburb, photos, description, budget, preferred time and the
                    deadline for submitting a quote.
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <section className="container-page pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-7">
            <h2 className="text-lg font-bold text-navy-800">For homeowners &amp; property managers</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              {[
                "Free to post, free to compare, free to chat",
                "Verified identity, business, insurance and trade checks",
                "Manage multiple properties from one dashboard",
                "Secure payments, deposits and milestone releases",
                "Real reviews from completed jobs only",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-good" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/post-job" className="btn btn-primary mt-6">
              Post a job
            </Link>
          </div>
          <div className="card p-7">
            <h2 className="text-lg font-bold text-navy-800">For service providers</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              {[
                "Free registration and free leads on the Starter plan",
                "Jobs matched to your trades, radius and availability",
                "Quote in one tap from your dashboard",
                "Build a verified profile that wins bigger work",
                "Analytics on response time, success rate and earnings",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-good" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/become-a-provider" className="btn btn-accent mt-6">
              Register free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
