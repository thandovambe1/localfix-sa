import { Suspense } from "react";
import type { Metadata } from "next";
import PostJobForm from "@/components/post-job-form";

export const metadata: Metadata = {
  title: "Request a job",
  description:
    "Post your home maintenance job free on LocalFix SA. Verified professionals nearby receive it instantly and send you quotes to compare.",
};

export default function PostJobPage() {
  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8 max-w-2xl">
        <span className="chip">⚡ Average first quote: 18 minutes</span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
          Tell us what needs fixing
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Three quick steps. Free forever for customers. Your request is broadcast to verified professionals near you
          the second you submit.
        </p>
      </div>
      <Suspense fallback={<div className="card h-96 shimmer" />}>
        <PostJobForm />
      </Suspense>
    </div>
  );
}
