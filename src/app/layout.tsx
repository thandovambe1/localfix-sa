import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import BackButton from "@/components/back-button";
import BackToTop from "@/components/back-to-top";

export const metadata: Metadata = {
  metadataBase: new URL("https://localfix.co.za"),
  title: {
    default: "LocalFix SA | Find trusted home service professionals near you",
    template: "%s | LocalFix SA",
  },
  description:
    "LocalFix SA instantly connects homeowners, landlords and businesses with verified local plumbers, electricians, painters, builders and more. Post a job free and compare quotes in minutes.",
  keywords: [
    "home services South Africa",
    "find a plumber",
    "electrician near me",
    "verified tradesmen",
    "get quotes South Africa",
    "LocalFix SA",
  ],
  openGraph: {
    title: "LocalFix SA — Your Home. Our Network.",
    description:
      "South Africa's real-time home services dispatch platform. Verified professionals, instant quotes, secure payments.",
    type: "website",
    locale: "en_ZA",
    siteName: "LocalFix SA",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f4f7ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-navy-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <BackButton />
        <main id="main">{children}</main>
        <SiteFooter />
        <BackToTop />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "LocalFix SA",
              slogan: "Your Home. Our Network.",
              url: "https://localfix.co.za",
              areaServed: "ZA",
              description:
                "Real-time home services dispatch platform connecting South Africans with verified local professionals.",
            }),
          }}
        />
      </body>
    </html>
  );
}
