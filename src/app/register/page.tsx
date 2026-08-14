import { redirect } from "next/navigation";
import type { Metadata } from "next";
import BrandLogo from "@/components/brand-logo";
import { CustomerRegisterForm } from "@/components/auth-forms";
import { getCustomerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Register a free LocalFix SA profile to post jobs, compare quotes from verified professionals and load your rainy-day wallet.",
};

const PERKS = [
  { icon: "🧰", title: "Track every job", body: "All your requests, quotes and invoices in one place." },
  { icon: "👛", title: "Rainy-day wallet", body: "Pre-load funds so an emergency repair never has to wait." },
  { icon: "⭐", title: "Saved professionals", body: "Re-book the trades you already trust in one tap." },
  { icon: "🏠", title: "Multiple properties", body: "Manage your home, rentals and holiday place together." },
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : undefined;
  if (await getCustomerSession()) redirect(next ?? "/dashboard/customer");

  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <BrandLogo size="lg" showTagline asLink={false} />
          <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-navy-800 sm:text-4xl">
            Create your free profile
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Posting jobs and comparing quotes is always free for customers. Register once and everything stays
            organised.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {PERKS.map((p) => (
              <li key={p.title} className="card p-4">
                <span className="text-xl" aria-hidden>
                  {p.icon}
                </span>
                <p className="mt-2 text-sm font-bold text-navy-800">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <CustomerRegisterForm next={next} />
      </div>
    </div>
  );
}
