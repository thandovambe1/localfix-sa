"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Monogram } from "@/components/brand-logo";
import SignOutIcon from "@/components/sign-out-icon";

const TABS = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/requests", label: "Job Requests", icon: "🧰" },
  { href: "/admin/payments", label: "Payments & Payouts", icon: "💰" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "💸" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/providers", label: "Providers", icon: "✅" },
];

export default function AdminNav({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mist ring-1 ring-black/[0.05]">
            <Monogram className="h-8 w-8" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Admin control centre</p>
            <p className="text-sm font-bold text-navy-800">
              {name}{" "}
              <span className="ml-1 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase text-navy-700">
                {role}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">{email}</p>
          </div>
        </div>
        <button onClick={logout} disabled={busy} className="btn btn-signout !px-4 !py-2 text-sm">
          <SignOutIcon />
          {busy ? "Signing out…" : "Sign Out"}
        </button>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Admin sections">
        {TABS.map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-navy-600 text-white shadow-sm"
                  : "bg-mist text-slate-600 hover:bg-navy-50 hover:text-navy-700"
              }`}
            >
              <span aria-hidden>{tab.icon}</span> {tab.label}
            </Link>
          );
        })}
        {role === "owner" ? (
          <Link
            href="/admin/settings"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              pathname.startsWith("/admin/settings")
                ? "bg-navy-600 text-white shadow-sm"
                : "bg-mist text-slate-600 hover:bg-navy-50 hover:text-navy-700"
            }`}
          >
            <span aria-hidden>⚙️</span> Settings
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
