import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProviderCard, SectionHeading } from "@/components/ui";
import { CATEGORY_BY_SLUG, SERVICE_CATEGORIES } from "@/lib/services";
import { getProviders } from "@/lib/queries";
import { zar } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORY_BY_SLUG.get(slug);
  if (!cat) return { title: "Service not found" };
  return {
    title: `${cat.name} professionals in South Africa`,
    description: `Find verified ${cat.name.toLowerCase()} professionals near you. ${cat.items.join(", ")}. Free quotes in minutes on LocalFix SA.`,
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORY_BY_SLUG.get(slug);
  if (!cat) notFound();

  const pros = await getProviders({ category: slug, limit: 12 });
  const related = SERVICE_CATEGORIES.filter((c) => c.slug !== slug).slice(0, 6);

  return (
    <>
      <section className="bg-white">
        <div className="container-page py-12 md:py-16">
          <nav className="mb-6 text-xs text-slate-500">
            <Link href="/" className="hover:text-teal-600">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/services" className="hover:text-teal-600">
              Services
            </Link>{" "}
            / <span className="font-semibold text-navy-700">{cat.name}</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mist text-3xl" aria-hidden>
                {cat.icon}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
                {cat.name} professionals near you
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
                {cat.tagline}. Post your job once and verified {cat.name.toLowerCase()} specialists within your radius
                are notified instantly — usually with quotes back inside the hour.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={`/post-job?category=${cat.slug}`} className="btn btn-accent">
                  Get free quotes
                </Link>
                <Link href={`/providers?category=${cat.slug}`} className="btn btn-ghost">
                  Browse all {pros.length} pros
                </Link>
              </div>
            </div>
            <div className="card p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-800">Typical price guide</h2>
              <p className="mt-2 text-3xl font-extrabold text-navy-800">
                {zar(cat.baseLow)} – {zar(cat.baseHigh)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Indicative national range. Our AI refines this for your specific job before you post.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li>✅ Free to post, free to compare</li>
                <li>✅ Insurance &amp; qualification checked</li>
                <li>✅ Pay securely through the platform</li>
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">What&apos;s covered</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cat.items.map((i) => (
                <li key={i} className="chip">
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <SectionHeading align="left" title={`Verified ${cat.name.toLowerCase()} specialists`} />
        {pros.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pros.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        ) : (
          <div className="card mt-8 p-8 text-center">
            <p className="text-sm text-slate-600">
              We&apos;re onboarding {cat.name.toLowerCase()} specialists in your area right now. Post your job and
              we&apos;ll dispatch it the moment a verified pro activates.
            </p>
            <Link href={`/post-job?category=${cat.slug}`} className="btn btn-accent mt-5">
              Post the job anyway
            </Link>
          </div>
        )}
      </section>

      <section className="container-page pb-16">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Related services</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {related.map((r) => (
            <Link key={r.slug} href={`/services/${r.slug}`} className="chip hover:bg-teal-50 hover:text-teal-700">
              <span aria-hidden>{r.icon}</span>
              {r.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
