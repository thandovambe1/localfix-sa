import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin-login-form";
import BrandLogo from "@/components/brand-logo";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" showTagline asLink={false} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-800">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Operations, verification and payouts control centre.
          </p>
        </div>

        <div className="mt-7">
          <AdminLoginForm next={sp.next} />
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500">
          Access is restricted to authorised platform staff. Register as a customer above if you don't have an
          operations account.
        </p>
      </div>
    </div>
  );
}
