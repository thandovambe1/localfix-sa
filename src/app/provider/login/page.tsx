import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BrandLogo from "@/components/brand-logo";
import ProviderLoginForm from "@/components/provider-login-form";
import { getProviderSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Provider login",
  description: "Service provider login for LocalFix SA.",
};

export default async function ProviderLoginPage() {
  if (await getProviderSession()) redirect("/dashboard/provider");

  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" showTagline asLink={false} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-800">Provider login</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Sign in to quote jobs, manage payouts and grow your service business.
          </p>
        </div>
        <div className="mt-7">
          <ProviderLoginForm />
        </div>
      </div>
    </div>
  );
}
