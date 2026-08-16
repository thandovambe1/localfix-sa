import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContactForm from "@/components/contact-form";
import { CONTENT_BY_SLUG, CONTENT_PAGES } from "@/lib/content";

export function generateStaticParams() {
  return CONTENT_PAGES.map((p) => ({ page: p.slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  const content = CONTENT_BY_SLUG.get(page);
  if (!content) return { title: "Page not found" };
  return { title: content.title, description: content.intro };
}

export default async function ContentPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const content = CONTENT_BY_SLUG.get(page);
  if (!content) notFound();

  return (
    <>
      <section className="bg-white">
        <div className="container-page py-12 md:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">{content.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-navy-800 sm:text-4xl">
            {content.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">{content.intro}</p>
        </div>
      </section>

      <div className="container-page space-y-14 py-14">
        {content.blocks.map((block, i) => {
          if (block.type === "prose")
            return (
              <section key={i} className="max-w-3xl">
                {block.heading ? <h2 className="section-title !text-2xl">{block.heading}</h2> : null}
                <div className="mt-4 space-y-4">
                  {block.body.map((p, j) => (
                    <p key={j} className="text-[15px] leading-relaxed text-slate-700">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            );

          if (block.type === "cards")
            return (
              <section key={i}>
                <h2 className="section-title !text-2xl">{block.heading}</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {block.items.map((item) => (
                    <article key={item.title} className="card card-hover p-6">
                      {item.icon ? (
                        <span className="text-2xl" aria-hidden>
                          {item.icon}
                        </span>
                      ) : null}
                      <h3 className="mt-3 text-base font-bold text-navy-800">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            );

          if (block.type === "faq")
            return (
              <section key={i} className="max-w-3xl">
                <h2 className="section-title !text-2xl">{block.heading}</h2>
                <div className="mt-6 space-y-3">
                  {block.items.map((item) => (
                    <details key={item.q} className="card group p-5 open:shadow-[var(--shadow-lift)]">
                      <summary className="cursor-pointer list-none text-[15px] font-bold text-navy-800 marker:hidden">
                        <span className="flex items-center justify-between gap-4">
                          {item.q}
                          <span className="text-teal-500 transition group-open:rotate-45" aria-hidden>
                            ＋
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            );

          if (block.type === "pricing")
            return (
              <section key={i}>
                <h2 className="section-title !text-2xl">{block.heading}</h2>
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  {block.tiers.map((tier) => (
                    <article
                      key={tier.name}
                      className={`card card-hover flex flex-col p-7 ${
                        tier.featured ? "ring-2 ring-teal-400" : ""
                      }`}
                    >
                      {tier.promoBadge ? (
                        <span className="mb-3 inline-flex w-fit rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          {tier.promoBadge}
                        </span>
                      ) : tier.featured ? (
                        <span className="mb-3 inline-flex w-fit rounded-full bg-teal-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                          Most popular
                        </span>
                      ) : null}
                      <h3 className="text-lg font-bold text-navy-800">{tier.name}</h3>
                      {tier.strikethroughPrice ? (
                        <p className="mt-2 text-lg font-semibold text-slate-400 line-through">
                          {tier.strikethroughPrice}/month
                        </p>
                      ) : null}
                      <p className={`text-4xl font-extrabold text-navy-800 ${tier.strikethroughPrice ? "" : "mt-2"}`}>
                        {tier.price}
                      </p>
                      <p className="text-xs text-slate-500">{tier.note}</p>
                      {tier.promoSubtext ? (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800">
                          {tier.promoSubtext}
                        </p>
                      ) : null}
                      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-700">
                        {tier.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <span className="text-good" aria-hidden>
                              ✓
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/become-a-provider"
                        className={`btn mt-6 w-full ${tier.featured ? "btn-accent" : "btn-ghost"}`}
                      >
                        Get started
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            );

          if (block.type === "posts")
            return (
              <section key={i}>
                <h2 className="section-title !text-2xl">{block.heading}</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {block.items.map((post) => (
                    <article key={post.title} className="card card-hover flex flex-col p-6">
                      <span className="chip w-fit">{post.tag}</span>
                      <h3 className="mt-3 text-base font-bold text-navy-800">{post.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                      <p className="mt-4 text-xs font-semibold text-teal-600">{post.read} read →</p>
                    </article>
                  ))}
                </div>
              </section>
            );

          return (
            <section key={i} className="max-w-3xl">
              <h2 className="section-title !text-2xl">{block.heading}</h2>
              <div className="mt-6">
                <ContactForm />
              </div>
            </section>
          );
        })}

        <section className="relative overflow-hidden rounded-[2.2rem] border border-black/[0.04] bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef7f1] p-8 shadow-[var(--shadow-soft)] md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-navy-100 blur-3xl opacity-50" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-100 blur-3xl opacity-50" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Ready to get it fixed?</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              Post your job free and compare quotes from verified professionals near you in minutes.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/post-job" className="btn btn-accent">
                Request a Job
              </Link>
              <Link href="/become-a-provider" className="btn btn-ghost bg-white">
                Become a Service Provider
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
