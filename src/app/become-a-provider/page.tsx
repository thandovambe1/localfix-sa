import type { Metadata } from "next";
import Image from "next/image";
import ProviderSignupForm from "@/components/provider-signup-form";

export const metadata: Metadata = {
  title: "Become a service provider",
  description:
    "Register your South African home services business free on LocalFix SA. Get verified, receive qualified local job leads instantly and grow with zero cold calling.",
};

export default function BecomeProviderPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f3f7ff] via-white to-[#edf8f3]">
        {/* Hero image texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <Image
            src="/images/provider-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-navy-100 blur-3xl opacity-60" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-100 blur-3xl opacity-60" />
        <div className="container-page relative grid gap-8 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <span className="chip bg-white shadow-sm">Free registration · No lead fees</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">
              Grow your business with qualified local leads
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Get verified once and start receiving real job requests from homeowners, landlords, estate agents and body
              corporates in your service radius — instantly, on your phone.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["📡", "Instant job broadcasts"],
              ["🆓", "Free Starter plan · 1 province"],
              ["🛡️", "Verified badges that convert"],
              ["📊", "Analytics & earnings"],
              ["🧾", "Quotes, invoices & payments"],
              ["⭐", "Reviews that build trust"],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-sm font-semibold text-navy-700 shadow-sm">
                <span aria-hidden>{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page py-12">
        <ProviderSignupForm />
      </div>
    </>
  );
}
