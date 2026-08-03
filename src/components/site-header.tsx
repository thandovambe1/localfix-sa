"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BrandLogo from "@/components/brand-logo";
import AccountMenu from "@/components/account-menu";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/trust-safety", label: "Trust & Safety" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all ${
        scrolled ? "border-slate-200/80 bg-white/90 backdrop-blur-md" : "border-transparent bg-white"
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <BrandLogo size="md" showTagline={true} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-navy-50 text-navy-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <AccountMenu />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-navy-700 md:hidden"
        >
          <span className="text-lg">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open ? (
        <div className="animate-fade-up border-t border-slate-100 bg-white px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.concat([
              { href: "/dashboard/customer", label: "My Dashboard" },
              { href: "/become-a-provider", label: "Become a Provider" },
              { href: "/provider/login", label: "Provider Login" },
            ]).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-3 text-[15px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <AccountMenu mobile />
        </div>
      ) : null}
    </header>
  );
}
