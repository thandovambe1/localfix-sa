"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Global LocalFix SA back button.
 *
 * Uses normal browser history where available so users return to the actual
 * previous page. If no meaningful same-window history exists, it falls back
 * to a route appropriate to the current area without exposing protected
 * pages to unauthenticated users.
 */
export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Do not show it on the homepage or on post-action success/failure pages
  // where a back action commonly creates confusing loops.
  if (
    pathname === "/" ||
    pathname.startsWith("/payments/success") ||
    pathname.startsWith("/payments/failed") ||
    pathname.startsWith("/payments/cancelled")
  ) {
    return null;
  }

  function fallbackForPath(path: string) {
    if (path.startsWith("/admin")) return "/admin";
    if (path.startsWith("/dashboard/provider") || path.startsWith("/provider")) return "/dashboard/provider";
    if (path.startsWith("/dashboard/customer") || path.startsWith("/inbox") || path.startsWith("/job-cards")) {
      return "/dashboard/customer";
    }
    if (path.startsWith("/jobs")) return "/dashboard/customer";
    if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/forgot-password")) return "/";
    return "/";
  }

  function goBack() {
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const current = typeof window !== "undefined" ? window.location.href : "";
    const hasUsefulHistory =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      (!referrer || referrer !== current);

    if (hasUsefulHistory) router.back();
    else router.push(fallbackForPath(pathname));
  }

  return (
    <div className="container-page print:hidden">
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back to previous page"
        className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-bold text-navy-700 shadow-[var(--shadow-soft)] transition hover:-translate-x-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/25"
      >
        <span className="text-base transition group-hover:-translate-x-0.5" aria-hidden>
          ←
        </span>
        Back
      </button>
    </div>
  );
}
