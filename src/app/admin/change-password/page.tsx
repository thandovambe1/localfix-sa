import type { Metadata } from "next";
import BrandLogo from "@/components/brand-logo";
import AdminPasswordChangeForm from "@/components/admin-password-change-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Change admin password", robots: { index: false, follow: false } };

export default function AdminChangePasswordPage() {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" showTagline asLink={false} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-800">Change admin password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Enter your admin email. A verification code will be sent to the founder only.
          </p>
        </div>
        <div className="mt-7">
          <AdminPasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
