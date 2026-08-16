import { redirect } from "next/navigation";
import type { Metadata } from "next";
import FounderChangePassword from "@/components/founder-change-password";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Founder settings", robots: { index: false } };

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (session.role !== "owner") {
    return (
      <div className="card p-10 text-center">
        <span className="text-3xl" aria-hidden>
          🔒
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-navy-800">Founder access only</h1>
        <p className="mt-2 text-sm text-slate-600">
          This settings page is restricted to the platform Founder (role: owner).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-800">Founder Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {session.email} · role: {session.role}
        </p>
      </header>

      <FounderChangePassword />
    </div>
  );
}
