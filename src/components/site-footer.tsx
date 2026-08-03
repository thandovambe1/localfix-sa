import Link from "next/link";
import NewsletterForm from "@/components/newsletter-form";
import BrandLogo from "@/components/brand-logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How it Works" },
      { href: "/become-a-provider", label: "Become a Provider" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/trust-safety", label: "Trust & Safety" },
      { href: "/help", label: "Help Centre" },
      { href: "/faqs", label: "FAQs" },
      { href: "/contact", label: "Contact Us" },
      { href: "/admin", label: "Admin Panel" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/popia", label: "POPIA Compliance" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/careers", label: "Careers" },
      { href: "/blog", label: "Blog" },
    ],
  },
];

const SOCIALS = [
  { label: "Facebook", icon: "f" as const },
  { label: "Instagram", icon: "ig" as const },
  { label: "LinkedIn", icon: "in" as const },
  { label: "X", icon: "𝕏" as const },
  { label: "TikTok", icon: "♪" as const },
];

function renderSocialIcon(key: string) {
  if (key === "ig") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  return key;
}

export default function SiteFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-[#0d1b30] text-slate-300">
      {/* Top accent rule */}
      <div className="h-1 w-full bg-gradient-to-r from-navy-600 via-[#0f9c96] to-navy-600" aria-hidden />

      {/* Subtle ambient light */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, #35c9c0 0%, transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "radial-gradient(circle, #5f86c9 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="container-page relative grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BrandLogo size="md" showTagline variant="dark" />
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-400">
            South Africa&apos;s real-time home services dispatch platform. Post a job free, get matched with verified
            professionals nearby, and compare transparent quotes in minutes.
          </p>
          <NewsletterForm dark />
          <div className="mt-6 flex gap-2.5">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-sm font-bold text-slate-300 ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-[#0f9c96] hover:text-white hover:ring-[#0f9c96]"
              >
                {renderSocialIcon(s.icon)}
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="flex items-center gap-2.5 text-[15px] font-extrabold uppercase tracking-[0.2em] text-white">
              <span className="h-[3px] w-6 rounded-full bg-[#0f9c96]" aria-hidden />
              {col.title}
            </h3>
            <ul className="mt-6 space-y-3.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group inline-flex items-center gap-2 text-[15px] font-semibold text-slate-300 transition hover:text-white"
                  >
                    <span
                      className="h-px w-0 bg-[#35c9c0] transition-all duration-300 group-hover:w-4"
                      aria-hidden
                    />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-7 text-[13px] font-medium text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LocalFix SA (Pty) Ltd. All rights reserved. Proudly South African 🇿🇦</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#35c9c0]" aria-hidden />
              SSL secured
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#35c9c0]" aria-hidden />
              POPIA compliant
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              ☎️ 0800 LOCALFIX
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
