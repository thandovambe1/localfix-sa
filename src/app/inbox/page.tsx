import Link from "next/link";
import type { Metadata } from "next";
import { QuoteComparePanel } from "@/components/quote-compare";
import { QuoteDocument } from "@/components/quote-document";
import { getCustomerSession } from "@/lib/auth";
import { formatZAR } from "@/lib/commission";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inbox", robots: { index: false } };

export default async function InboxPage() {
  const session = await getCustomerSession();

  if (!session) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <span className="text-4xl" aria-hidden>📬</span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy-800">Your inbox</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Quotes from verified professionals land here automatically. Sign in to read them.
          </p>
          <Link href="/login?next=/inbox" className="btn btn-accent mt-6">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/inbox`, {
    cache: "no-store",
  }).catch(() => null);

  // Server-side fetch of own inbox; fall back to empty if unreachable.
  let messages: Awaited<ReturnType<typeof parseInbox>> = [];
  if (res?.ok) messages = await parseInbox(res);

  return (
    <div className="container-page py-8 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Customer inbox</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
            Quotes &amp; notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every quote arrives here on the official LocalFix template, ranked by your quoting agent.
          </p>
        </div>
        <MarkAllRead count={messages.filter((m) => !m.read).length} />
      </header>

      {messages.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <span className="text-4xl" aria-hidden>📭</span>
          <p className="mt-4 text-base font-bold text-navy-800">Your inbox is empty</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            Post a job and quotes from verified professionals will arrive here within minutes.
          </p>
          <Link href="/post-job" className="btn btn-accent mt-6">
            Request a job
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {messages.map((m) => (
            <InboxItem key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  );
}

async function parseInbox(res: Response) {
  const data = (await res.json()) as {
    messages: {
      id: number;
      type: string;
      title: string;
      body: string;
      read: boolean;
      createdAt: string;
      quote: {
        id: number;
        amount: number;
        message: string;
        availability: string;
        warrantyMonths: number;
        includesMaterials: boolean;
        createdAt: string;
      } | null;
      job: {
        id: number;
        reference: string;
        title: string;
        categorySlug: string;
        customerName: string;
        city: string;
        suburb: string;
        province: string;
        quoteDeadline: string | null;
      } | null;
      provider: {
        id: number;
        businessName: string;
        ownerName: string;
        rating: string;
        reviewCount: number;
        city: string;
        badges: string[];
        accent: string;
        logoUrl: string | null;
      } | null;
    }[];
  };
  return data.messages;
}

function InboxItem({ message: m }: { message: Awaited<ReturnType<typeof parseInbox>>[number] }) {
  const isQuote = m.type === "new_quote" && m.quote && m.job && m.provider;

  return (
    <article className={`card overflow-hidden ${m.read ? "" : "ring-2 ring-teal-300"}`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-mist/60 px-5 py-3">
        {!m.read ? <span className="h-2.5 w-2.5 rounded-full bg-teal-500" aria-label="Unread" /> : null}
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-navy-800">{m.title}</p>
        <span className="text-xs text-slate-400">{timeAgo(m.createdAt)}</span>
        <MarkRead id={m.id} />
      </div>

      <div className="p-5">
        <p className="text-sm leading-relaxed text-slate-600">{m.body}</p>

        {isQuote ? (
          <div className="mt-5 space-y-6">
            <QuoteDocument
              quote={{
                id: m.quote!.id,
                amount: m.quote!.amount,
                message: m.quote!.message,
                availability: m.quote!.availability,
                warrantyMonths: m.quote!.warrantyMonths,
                includesMaterials: m.quote!.includesMaterials,
                createdAt: new Date(m.quote!.createdAt),
              }}
              provider={{
                businessName: m.provider!.businessName,
                ownerName: m.provider!.ownerName,
                rating: m.provider!.rating,
                reviewCount: m.provider!.reviewCount,
                city: m.provider!.city,
                badges: m.provider!.badges,
                accent: m.provider!.accent,
                logoUrl: m.provider!.logoUrl,
              }}
              job={{
                reference: m.job!.reference,
                title: m.job!.title,
                categorySlug: m.job!.categorySlug,
                customerName: m.job!.customerName,
                city: m.job!.city,
                suburb: m.job!.suburb,
                province: m.job!.province,
              }}
              validUntil={m.job!.quoteDeadline ? new Date(m.job!.quoteDeadline) : null}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-navy-800">
                Total: {formatZAR(m.quote!.amount * 100)}
              </p>
              <div className="flex gap-2">
                <Link href={`/jobs/${m.job!.id}`} className="btn btn-ghost !px-4 !py-2 text-sm">
                  Compare all quotes
                </Link>
                <Link href={`/jobs/${m.job!.id}`} className="btn btn-accent !px-4 !py-2 text-sm">
                  Accept &amp; pay
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MarkAllRead({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <button
      onClick={async () => {
        await fetch("/api/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
        location.reload();
      }}
      className="btn btn-ghost !px-4 !py-2 text-sm"
    >
      Mark all as read ({count})
    </button>
  );
}

function MarkRead({ id }: { id: number }) {
  return (
    <button
      onClick={async () => {
        await fetch("/api/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        location.reload();
      }}
      className="text-xs font-semibold text-slate-400 transition hover:text-teal-600"
    >
      Mark read
    </button>
  );
}
