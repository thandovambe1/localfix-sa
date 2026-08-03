"use client";

import Link from "next/link";

export interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  variant?: "light" | "dark";
  asLink?: boolean;
}

/* Brand inks — pulled straight from the master logo artwork */
const NAVY = "#0c2f5f";
const TEAL = "#0f9c96";

/**
 * The LF-house monogram: a navy gable roof with chimney and a 2×2 window
 * grid, whose walls are formed by the letters L (navy) and F (teal).
 */
export function Monogram({
  className,
  navy = NAVY,
  teal = TEAL,
}: {
  className: string;
  navy?: string;
  teal?: string;
}) {
  return (
    <svg viewBox="0 0 100 96" className={className} aria-hidden="true">
      {/* Roof */}
      <path
        d="M 11 41 L 50 9 L 89 41"
        fill="none"
        stroke={navy}
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* Chimney */}
      <rect x="70.5" y="15" width="9" height="16" rx="0.5" fill={navy} />

      {/* 2×2 attic window */}
      <g fill={navy}>
        <rect x="42.5" y="20" width="6.5" height="6.5" rx="0.6" />
        <rect x="51.5" y="20" width="6.5" height="6.5" rx="0.6" />
        <rect x="42.5" y="29" width="6.5" height="6.5" rx="0.6" />
        <rect x="51.5" y="29" width="6.5" height="6.5" rx="0.6" />
      </g>

      {/* L — left wall and foot, top cut parallel to the roof pitch */}
      <path d="M 30 40.5 L 41 31.5 L 41 78 L 54 78 L 54 89 L 30 89 Z" fill={navy} />

      {/* F — right wall: rounded top bar, angled middle bar */}
      <path
        d="M 59 44 H 85 Q 90 44 90 49 V 50 Q 90 55 85 55 H 70 V 63 H 84 L 79 72 H 70 V 89 H 59 Z"
        fill={teal}
      />
    </svg>
  );
}

export default function BrandLogo({
  href = "/",
  size = "md",
  showTagline = true,
  className = "",
  variant = "light",
  asLink = true,
}: BrandLogoProps) {
  const isDark = variant === "dark";

  const iconSizes = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-16 w-16" };
  const wordSizes = { sm: "text-[19px]", md: "text-[22px]", lg: "text-[34px]" };
  const badgeSizes = {
    sm: "px-[5px] py-[1px] text-[10px] rounded-[5px]",
    md: "px-[6px] py-[2px] text-[12px] rounded-md",
    lg: "px-2 py-1 text-[18px] rounded-lg",
  };
  const taglineSizes = { sm: "text-[7.5px]", md: "text-[8.5px]", lg: "text-[12px]" };
  const dashSizes = { sm: "w-4", md: "w-5", lg: "w-9" };

  const navyText = isDark ? "#ffffff" : NAVY;

  const content = (
    <span className={`group inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Monogram */}
      <span className="relative shrink-0 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
        <Monogram
          className={iconSizes[size]}
          navy={isDark ? "#eaf1fb" : NAVY}
          teal={isDark ? "#35c9c0" : TEAL}
        />
      </span>

      {/* Wordmark + tagline column */}
      <span className="flex flex-col">
        <span className="inline-flex items-center leading-none">
          <span
            className={`font-extrabold tracking-tight ${wordSizes[size]}`}
            style={{ color: navyText }}
          >
            Local
          </span>
          <span className={`font-extrabold tracking-tight ${wordSizes[size]}`} style={{ color: TEAL }}>
            Fix
          </span>
          <span
            className={`ml-1.5 inline-flex items-center justify-center font-extrabold tracking-wide text-white ${badgeSizes[size]}`}
            style={{ backgroundColor: TEAL }}
            aria-label="South Africa"
          >
            SA
          </span>
        </span>

        {showTagline ? (
          <span
            className={`mt-1.5 flex items-center gap-1.5 font-bold uppercase sm:gap-2 ${taglineSizes[size]} ${
              size === "sm" ? "hidden lg:flex" : ""
            }`}
            style={{ letterSpacing: "0.24em" }}
          >
            <span className={`h-[1.5px] rounded-full ${dashSizes[size]}`} style={{ backgroundColor: TEAL }} aria-hidden />
            <span style={{ color: navyText }}>Your&nbsp;Home.</span>
            <span style={{ color: TEAL }}>Our&nbsp;Network</span>
            <span className={`h-[1.5px] rounded-full ${dashSizes[size]}`} style={{ backgroundColor: TEAL }} aria-hidden />
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link href={href} aria-label="LocalFix SA — home" className="shrink-0">
      {content}
    </Link>
  );
}
