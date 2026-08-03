"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Me = { id: number; name: string; email: string; walletCents: number; inboxUnread?: number } | null;

function zar(cents: number) {
  return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { customer: Me }) => {
        if (alive) {
          setMe(d.customer);
          setLoaded(true);
        }
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    await fetch("/api/auth/me", { method: "POST" });
    setMe(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!loaded) {
    return <span className={mobile ? "hidden" : "h-9 w-24 rounded-full shimmer"} aria-hidden />;
  }

  // ── Signed out ──
  if (!me) {
    if (mobile) {
      return (
        <div className="mt-2 grid gap-2">
          <Link href="/login" className="btn btn-ghost w-full">
            Log in
          </Link>
          <Link href="/register" className="btn btn-primary w-full">
            Sign up free
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-ghost !px-4 !py-2 text-sm">
          Log in
        </Link>
        <Link href="/provider/login" className="btn btn-ghost !px-4 !py-2 text-sm">
          Provider
        </Link>
        <Link href="/post-job" className="btn btn-accent !px-5 !py-2.5 text-sm">
          Request a Job
        </Link>
      </div>
    );
  }

  // ── Signed in ──
  const initials = me.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  if (mobile) {
    return (
      <div className="mt-2 space-y-2">
        <div className="rounded-2xl bg-teal-50 px-4 py-3">
          <p className="text-sm font-bold text-navy-800">{me.name}</p>
          <p className="text-xs text-slate-600">Wallet balance</p>
          <p className="text-lg font-extrabold text-teal-700">{zar(me.walletCents)}</p>
        </div>
        <Link href="/dashboard/customer" className="btn btn-ghost w-full">
          My dashboard
        </Link>
        <Link href="/inbox" className="btn btn-ghost w-full">
          Inbox{(me.inboxUnread ?? 0) > 0 ? ` (${me.inboxUnread} new)` : ""}
        </Link>
        <Link href="/post-job" className="btn btn-accent w-full">
          Request a Job
        </Link>
        <button onClick={signOut} className="btn btn-ghost w-full !text-bad">
          Sign out
        </button>
      </div>
    );
  }

  const unread = me.inboxUnread ?? 0;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/inbox"
        className="relative hidden h-10 w-10 place-items-center rounded-full border border-black/[0.08] bg-white text-navy-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700 lg:grid"
        title="Inbox"
        aria-label={`Inbox${unread ? `, ${unread} unread` : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unread}
          </span>
        ) : null}
      </Link>

      <Link
        href="/dashboard/customer"
        className="hidden items-center gap-1.5 rounded-full bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition hover:bg-teal-100 lg:inline-flex"
        title="Wallet balance"
      >
        <span aria-hidden>👛</span>
        {zar(me.walletCents)}
      </Link>

      <div className="relative" ref={boxRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-navy-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-600 text-[11px] font-black text-white">
            {initials}
          </span>
          <span className="hidden max-w-[90px] truncate sm:block">{me.name.split(" ")[0]}</span>
          <span className="text-[10px]" aria-hidden>
            ▾
          </span>
        </button>

        {open ? (
          <div
            role="menu"
            className="animate-fade-up absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[var(--shadow-lift)]"
          >
            <div className="border-b border-slate-100 bg-mist px-4 py-3">
              <p className="truncate text-sm font-bold text-navy-800">{me.name}</p>
              <p className="truncate text-xs text-slate-500">{me.email}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Wallet</p>
              <p className="text-lg font-extrabold text-teal-700">{zar(me.walletCents)}</p>
            </div>
            {[
              { href: "/dashboard/customer", label: "My dashboard", icon: "🗂️" },
              { href: "/dashboard/customer#wallet", label: "Top up wallet", icon: "👛" },
              { href: "/post-job", label: "Request a job", icon: "🧰" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-bad transition hover:bg-red-50"
            >
              <span aria-hidden>↩</span> Sign out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
