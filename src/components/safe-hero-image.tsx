"use client";

import { useState } from "react";
import Image from "next/image";
import { Monogram } from "@/components/brand-logo";

/**
 * Resilient hero image.
 *
 * Renders the photo with next/image when available. If the binary asset is
 * missing from the deployment (e.g. not committed to the repo) or fails to
 * load, it swaps to a fully designed CSS/SVG scene so the hero never shows
 * a broken or blank area on production.
 */
export default function SafeHeroImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`relative ${className ?? ""}`} role="img" aria-label={alt}>
        {/* Designed gradient scene fallback */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-100 via-[#eaf4f1] to-teal-100" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(15,156,150,0.18) 0, transparent 45%), radial-gradient(circle at 80% 75%, rgba(27,59,111,0.16) 0, transparent 50%)",
          }}
        />
        {/* Subtle blueprint grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(27,59,111,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(27,59,111,0.12) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* House line-art */}
        <svg
          viewBox="0 0 200 140"
          className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 text-navy-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M28 74 L100 22 L172 74" />
          <path d="M138 40 v-16 h18 v29" />
          <path d="M46 70 v52 h108 v-52" />
          <rect x="86" y="86" width="28" height="36" rx="3" className="text-teal-500" stroke="currentColor" />
          <circle cx="108" cy="104" r="1.6" fill="currentColor" className="text-teal-500" />
          <rect x="60" y="86" width="16" height="16" rx="2" />
          <rect x="124" y="86" width="16" height="16" rx="2" />
        </svg>
        <div className="absolute bottom-4 right-4 opacity-30">
          <Monogram className="h-16 w-16" />
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1400}
      height={1000}
      quality={92}
      priority
      sizes="(max-width: 1024px) 100vw, 46vw"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
