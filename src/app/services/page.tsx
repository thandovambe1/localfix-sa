import type { Metadata } from "next";
import ServiceSearch from "@/components/service-search";
import { SectionHeading } from "@/components/ui";
import { ServiceTileDetailed } from "@/components/service-thumbnail";
import { SERVICE_CATEGORIES } from "@/lib/services";

export const metadata: Metadata = {
  title: "All home services",
  description:
    "Browse every LocalFix SA service category — plumbing, electrical, builders, painters, roofing, solar, security, removals and more. Verified professionals nationwide.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-white">
        <div className="container-page py-12 md:py-16">
          <SectionHeading
            align="left"
            eyebrow="Service directory"
            title="Every service, one network"
            subtitle="20+ categories and 100+ specialist sub-services covered by verified South African professionals."
          />
          <div className="mt-8 max-w-2xl">
            <ServiceSearch />
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((c) => (
            <ServiceTileDetailed key={c.slug} category={c} />
          ))}
        </div>
      </section>
    </>
  );
}
