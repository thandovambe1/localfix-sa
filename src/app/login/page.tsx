import { redirect } from "next/navigation";
import type { Metadata } from "next";
import BrandLogo from "@/components/brand-logo";
import { CustomerLoginForm } from "@/components/auth-forms";
import { getCustomerSession } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your LocalFix SA account to manage jobs, quotes and your wallet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  if (await getCustomerSession()) redirect("/dashboard/customer");

  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" showTagline asLink={false} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-800">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to track your jobs, compare quotes and manage your wallet.
          </p>
        </div>

        <div className="mt-7">
          <CustomerLoginForm next={sp.next} />
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500">
          Sign in with the account you registered with. If you don&apos;t have one,{" "}
          <Link href="/register" className="font-semibold text-teal-700 hover:underline">
            create it free
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
