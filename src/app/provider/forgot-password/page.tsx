import type { Metadata } from "next";
import BrandLogo from "@/components/brand-logo";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset provider password",
  description: "Reset your LocalFix SA service provider password using a verification code sent to your registered business email.",
};

export default function ProviderForgotPasswordPage() {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" showTagline asLink={false} />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-800">Reset provider password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            We&apos;ll send a verification code to the business email registered on your provider profile.
          </p>
        </div>
        <div className="mt-7">
          <ForgotPasswordForm accountType="provider" />
        </div>
      </div>
    </div>
  );
}
