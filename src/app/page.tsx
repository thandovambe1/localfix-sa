import Link from "next/link";
import ServiceSearch from "@/components/service-search";
import { ChristmasLights } from "@/components/christmas-decor";
import HeroSlideshow from "@/components/hero-slideshow";
import { SectionHeading } from "@/components/ui";
import { ServiceTileCompact } from "@/components/service-thumbnail";
import TestimonialsCarousel from "@/components/testimonials-carousel";
import { SERVICE_CATEGORIES } from "@/lib/services";
import { getStats } from "@/lib/queries";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: 1,
    icon: "🧭",
    title: "Choose a service",
    body: "Pick from 20+ verified trade categories — or just type what's broken and let our AI categorise it.",
  },
  {
    n: 2,
    icon: "📝",
    title: "Describe your job",
    body: "Photos, urgency, preferred date, budget and location. Two minutes, no phone calls.",
  },
  {
    n: 3,
    icon: "📡",
    title: "We broadcast instantly",
    body: "Verified pros within your radius get notified by push, email, SMS and WhatsApp in real time.",
  },
  {
    n: 4,
    icon: "✅",
    title: "Compare and accept",
    body: "Quotes land in your dashboard. Compare price, rating and availability, then accept one.",
  },
];

const TRUST = [
  { icon: "🪪", title: "Identity verified", body: "Every provider's ID, business registration and address is checked before activation." },
  { icon: "🛡️", title: "Insurance on file", body: "Public liability cover verified and displayed on the provider profile." },
  { icon: "💳", title: "Secure payments", body: "PayFast, Ozow, Yoco and instant EFT — with deposits, milestones and invoices." },
  { icon: "⭐", title: "Real reviews only", body: "Ratings can only be left by customers who accepted a quote through LocalFix." },
];

export default async function HomePage() {
  const stats = await getStats();

  return (
    <>
      {/* HERO — light, soft, friendly */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f3f7ff] via-white to-[#edf8f3] pb-6">
        {/* Soft pastel blobs - enhanced for richer refraction behind glass */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-28 h-[36rem] w-[36rem] rounded-full bg-navy-200 blur-[100px] opacity-70" />
          <div className="absolute -bottom-40 -right-20 h-[40rem] w-[40rem] rounded-full bg-teal-200 blur-[100px] opacity-75" />
          <div className="absolute left-1/3 top-[35%] h-[26rem] w-[26rem] rounded-full bg-[#cbdffd] blur-[90px] opacity-60" />
        </div>

        <div className="container-page relative py-12 md:py-16 lg:py-20">
          <ChristmasLights count={28} className="mb-6" />
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* Left — copy, actions & search */}
            <div className="mx-auto flex max-w-2xl animate-fade-up flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
              <span className="chip !border-red-200 !bg-white text-navy-700 shadow-sm ring-1 ring-black/[0.04]">
                🎄 Festive Season · Pros on call through Christmas &amp; New Year
              </span>
              <h1 className="mt-5 text-[2.2rem] font-extrabold leading-[1.06] tracking-tight text-navy-900 sm:text-5xl lg:text-[3.35rem]">
                Find trusted professionals near you in{" "}
                <span className="christmas-headline">minutes. 🎅</span>
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-[17px]">
                Whether it&apos;s a leaking tap, moving house, electrical emergency or complete home renovation, LocalFix
                instantly connects you with verified professionals nearby.
              </p>

              <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row lg:justify-start">
                <Link href="/post-job" className="btn btn-accent text-[15px]">
                  Request a Job
                </Link>
                <Link href="/become-a-provider" className="btn btn-ghost bg-white text-[15px] shadow-[var(--shadow-soft)]">
                  Become a Service Provider
                </Link>
              </div>

              <div className="mt-9 w-full max-w-xl">
                <ServiceSearch />
              </div>

              <div className="christmas-glow mt-6 w-full max-w-xl rounded-2xl border border-red-200/70 bg-white/85 p-4 text-center backdrop-blur sm:text-left">
                <p className="text-sm font-bold text-navy-800">
                  🎅 Holiday home prep, sorted — emergency plumbers &amp; electricians available 24/7, even on
                  Christmas Day 🎁
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  From braais to guest rooms, get your home holiday-ready with verified local pros.
                </p>
              </div>
            </div>

            {/* Right — rotating hero images sit beneath all credibility overlays */}
            <div className="relative isolate animate-fade-up [animation-delay:140ms]">
              <HeroSlideshow />

              {/* In-image Average Rating overlay — always above the slideshow */}
              <div className="pointer-events-none absolute bottom-5 left-5 z-40 rounded-2xl bg-navy-900/75 px-4 py-2.5 text-white backdrop-blur-md">
                <p className="text-sm font-extrabold">★ {num(stats?.avgRating, 4.8).toFixed(1)} average rating</p>
                <p className="text-[11px] text-white/75">from real completed jobs</p>
              </div>

              {/* Verified Pros overlay — always above the slideshow */}
              <div className="absolute -top-4 left-4 z-40 rounded-2xl border border-black/[0.05] bg-white/95 px-4 py-2.5 shadow-[var(--shadow-lift)] backdrop-blur sm:-left-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Verified pros</p>
                <p className="text-sm font-extrabold text-navy-800">🛡️ ID · insurance · trade</p>
              </div>

              {/* Average First Quote overlay — always above the slideshow */}
              <div className="absolute -bottom-4 right-4 z-40 rounded-2xl border border-black/[0.05] bg-white/95 px-4 py-2.5 shadow-[var(--shadow-lift)] backdrop-blur sm:-right-5">
                <p className="text-sm font-extrabold text-navy-800">⚡ {Math.round(num(stats?.avgResponse, 18))} min</p>
                <p className="text-[11px] font-semibold text-slate-500">average first quote</p>
              </div>
            </div>
          </div>

          <dl className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { label: "Verified professionals", value: "75+" },
              { label: "Jobs dispatched", value: "13" },
              { label: "Average rating", value: "4.8 ★" },
              { label: "Average response", value: `${Math.round(num(stats?.avgResponse, 18))} min` },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`relative rounded-[1.4rem] border bg-white p-4 shadow-[var(--shadow-soft)] ${
                  i === 0 ? "border-red-200 ring-2 ring-red-300/60" : "border-black/[0.04]"
                }`}
              >
                {i === 0 ? (
                  <span aria-hidden className="absolute -right-2 -top-3 rotate-12 text-xl drop-shadow">
                    🎅
                  </span>
                ) : null}
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</dt>
                <dd className="mt-1 text-xl font-extrabold text-navy-800 sm:text-2xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FESTIVE SEASON */}
      <section className="container-page py-16 md:py-20">
        <ChristmasLights count={30} className="mb-8" />
        <SectionHeading
          eyebrow="🎄 Festive season"
          title="Get your home holiday-ready"
          subtitle="Guest rooms, braai areas, fairy lights and last-minute fixes — verified pros are on call right through Christmas and New Year."
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🧹",
              title: "Guest-ready deep cleans",
              body: "Sparkling homes for holiday visitors, from kitchens to guest bathrooms.",
              href: "/post-job?category=cleaning",
            },
            {
              icon: "💡",
              title: "Festive lights & electrical",
              body: "Safe fairy-light installs, extra plugs and holiday electrical checks.",
              href: "/post-job?category=electrical",
            },
            {
              icon: "🍖",
              title: "Braai & outdoor areas",
              body: "Patios, gardens and entertainment spaces ready for long summer evenings.",
              href: "/post-job?category=garden-services",
            },
            {
              icon: "🚨",
              title: "Holiday emergency cover",
              body: "Burst geysers and power faults don't take holidays — neither do our 24/7 pros.",
              href: "/post-job?urgency=emergency",
            },
          ].map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="card card-hover group block p-6 text-center ring-1 ring-red-100"
            >
              <span
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-red-50 to-green-50 text-3xl ring-1 ring-red-100 transition group-hover:scale-110"
                aria-hidden
              >
                {c.icon}
              </span>
              <span className="mt-4 block text-base font-bold text-navy-800">{c.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-slate-600">{c.body}</span>
              <span className="mt-3 inline-block text-xs font-bold text-red-700 group-hover:underline">
                Book now →
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/post-job" className="btn btn-accent">
            🎁 Book your festive fix — it&apos;s free to post
          </Link>
        </div>
      </section>

      {/* SERVICES */}
      <section className="container-page py-16 md:py-20">
        <SectionHeading
          eyebrow="Services"
          title="Every trade your property needs"
          subtitle="From a blocked drain at 22:00 to a full solar installation — one platform, verified specialists, transparent quotes."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {SERVICE_CATEGORIES.map((c) => (
            <ServiceTileCompact key={c.slug} category={c} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/services" className="btn btn-ghost">
            Browse all services &amp; sub-categories
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-16 md:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="How it works"
            title="Four steps. Under three minutes."
            subtitle="No call centres, no chasing quotes, no awkward negotiations. Post once, and let the network come to you."
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="card card-hover relative p-6">
                <span className="absolute right-5 top-5 text-4xl font-black text-navy-50">{s.n}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <h3 className="mt-4 text-base font-bold text-navy-800">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/post-job" className="btn btn-primary">
              Post a job — it&apos;s free
            </Link>
            <Link href="/how-it-works" className="btn btn-ghost">
              See the full walkthrough
            </Link>
          </div>
        </div>
      </section>

      {/* WHY MATCHING (identities protected until payment) */}
      <section className="container-page py-16 md:py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <SectionHeading
            eyebrow="Protected marketplace"
            title="You compare quotes, not business cards"
            subtitle="Providers stay anonymous until you accept a quote and payment clears. Every job, message and payment stays on-platform — so you're always protected."
          />
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            { icon: "🎭", title: "Anonymous quotes", body: "Compare price, rating, distance and availability from Pro A, Pro B, Pro C — no pressure, no cold calls." },
            { icon: "🔓", title: "Reveal on payment", body: "The provider's name, logo and direct contact unlock the moment your payment clears." },
            { icon: "🛡️", title: "On-platform only", body: "Agreements, chat and money stay inside LocalFix SA, where disputes and refunds are handled." },
          ].map((c) => (
            <div key={c.title} className="card card-hover p-6 text-center">
              <span className="text-2xl" aria-hidden>{c.icon}</span>
              <h3 className="mt-3 text-base font-bold text-navy-800">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-white py-16 md:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Trust & safety"
            title="Verification is not a badge. It's a process."
            subtitle="Every professional passes document checks before their first lead. Ongoing performance keeps them there."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="card card-hover p-6">
                <span className="text-2xl" aria-hidden>
                  {t.icon}
                </span>
                <h3 className="mt-3 text-base font-bold text-navy-800">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="container-page py-16 md:py-20">
        <SectionHeading
          eyebrow="Customer stories"
          title="South Africans are getting it fixed faster"
          subtitle="A rotating selection of homeowner experiences across plumbing, electrical, cleaning, internet setup, removals and more."
        />
        <TestimonialsCarousel />
      </section>

      {/* PROVIDER CTA — light soft card */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-black/[0.04] bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef7f1] p-8 text-center shadow-[var(--shadow-soft)] md:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-navy-100 blur-3xl opacity-60" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-teal-100 blur-3xl opacity-60" />
          <div className="relative mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-center">
            <div className="mx-auto max-w-xl md:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow">
                🎄 Festive rush: homeowners are booking now
              </span>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">For service providers</p>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
                Free leads. Real customers. Zero cold calling.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
                Register your business, get verified, and start receiving qualified job requests from your area
                instantly. No subscription required to start — you only upgrade when you&apos;re winning work.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
                <Link href="/become-a-provider" className="btn btn-accent">
                  Register free
                </Link>
                <Link href="/pricing" className="btn btn-ghost bg-white">
                  See pricing
                </Link>
              </div>
            </div>
            <ul className="mx-auto grid w-full max-w-md gap-3 sm:grid-cols-2">
              {[
                ["📡", "Instant job broadcasts"],
                ["📊", "Business analytics"],
                ["🧾", "Invoices & payments"],
                ["⭐", "Reviews that win work"],
                ["🗓️", "Calendar & scheduling"],
                ["🤖", "AI quote assistance"],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-sm font-semibold text-navy-700 shadow-sm">
                  <span aria-hidden>{icon}</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
