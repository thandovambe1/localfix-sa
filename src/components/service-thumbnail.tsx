import Link from "next/link";
import type { ServiceCategory } from "@/lib/services";

/**
 * Soft pastel pairs for each category — keeps the light theme friendly
 * while adding subtle visual differentiation without heavy colours.
 */
const PASTELS: Record<string, { bg: string; ring: string; glow: string }> = {
  plumbing: { bg: "from-[#e8f1ff] to-[#dceaff]", ring: "ring-[#c9dbff]/60", glow: "bg-[#dbe8ff]" },
  electrical: { bg: "from-[#fff2d6] to-[#ffe9b3]", ring: "ring-[#ffde9a]/60", glow: "bg-[#fff1c9]" },
  builders: { bg: "from-[#f0e9ff] to-[#e2d6ff]", ring: "ring-[#d8c5ff]/60", glow: "bg-[#ece2ff]" },
  painters: { bg: "from-[#ffe2ec] to-[#ffd1e0]", ring: "ring-[#ffc1d4]/60", glow: "bg-[#ffe0ea]" },
  roofing: { bg: "from-[#dfefff] to-[#c9deff]", ring: "ring-[#b5cfff]/60", glow: "bg-[#d7e7ff]" },
  "garden-services": { bg: "from-[#dff3e8] to-[#c8e9d3]", ring: "ring-[#b8dfc6]/60", glow: "bg-[#d6efde]" },
  cleaning: { bg: "from-[#e0f6ff] to-[#c9eeff]", ring: "ring-[#aee6ff]/60", glow: "bg-[#d6f1ff]" },
  security: { bg: "from-[#e6e8f2] to-[#d3d7ea]", ring: "ring-[#c4c9de]/60", glow: "bg-[#dee1ef]" },
  flooring: { bg: "from-[#efe6d8] to-[#e6d9c3]", ring: "ring-[#d9c8ab]/60", glow: "bg-[#ece2d1]" },
  carpentry: { bg: "from-[#f3e8d3] to-[#ecdcc0]", ring: "ring-[#e2cfad]/60", glow: "bg-[#f1e6cf]" },
  welding: { bg: "from-[#ede6f2] to-[#ddd1e8]", ring: "ring-[#cfbdda]/60", glow: "bg-[#e8ddf0]" },
  "air-conditioning": { bg: "from-[#dcf5ff] to-[#c2ecff]", ring: "ring-[#a6e1ff]/60", glow: "bg-[#d0f0ff]" },
  "appliance-repairs": { bg: "from-[#fff0dc] to-[#ffe5bf]", ring: "ring-[#ffd9a1]/60", glow: "bg-[#ffecd1]" },
  "glass-aluminium": { bg: "from-[#e4f0ff] to-[#cfe2ff]", ring: "ring-[#b9d2ff]/60", glow: "bg-[#d9e8ff]" },
  paving: { bg: "from-[#e8e8e4] to-[#dcdcd6]", ring: "ring-[#cfcfc8]/60", glow: "bg-[#eaeae6]" },
  solar: { bg: "from-[#fff4c6] to-[#ffea8a]", ring: "ring-[#ffe27a]/70", glow: "bg-[#fff2b8]" },
  pools: { bg: "from-[#d5f1ff] to-[#b8e6ff]", ring: "ring-[#99daff]/60", glow: "bg-[#c9ecff]" },
  "pest-control": { bg: "from-[#dff0dd] to-[#c9e6c6]", ring: "ring-[#b5d8b1]/60", glow: "bg-[#d7ebd4]" },
  removals: { bg: "from-[#ffe5d3] to-[#ffd0ad]", ring: "ring-[#ffb98a]/60", glow: "bg-[#ffe0c5]" },
  handyman: { bg: "from-[#e3ecff] to-[#ccd9f2]", ring: "ring-[#b5c4e0]/60", glow: "bg-[#dde6f5]" },
  "property-maintenance": { bg: "from-[#e9f0e0] to-[#d6e3c8]", ring: "ring-[#c5d3b4]/60", glow: "bg-[#e1ebd6]" },
};

function pastelFor(slug: string) {
  return PASTELS[slug] ?? { bg: "from-[#f3f7ff] to-[#e8eefc]", ring: "ring-black/[0.04]", glow: "bg-navy-50" };
}

export function ServiceTileCompact({ category }: { category: ServiceCategory }) {
  const p = pastelFor(category.slug);
  return (
    <Link
      href={`/services/${category.slug}`}
      className="group relative flex flex-col items-center overflow-hidden rounded-[1.8rem] border border-black/[0.04] bg-white p-6 text-center shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)] hover:border-black/[0.06]"
    >
      {/* Soft glow blob behind icon */}
      <div
        className={`pointer-events-none absolute left-1/2 top-6 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl opacity-0 transition-all duration-500 group-hover:opacity-80 group-hover:scale-110 ${p.glow}`}
        aria-hidden
      />

      {/* Icon — big, centered */}
      <div
        className={`relative mx-auto grid h-[72px] w-[72px] place-items-center rounded-[1.35rem] bg-gradient-to-br ${p.bg} text-[32px] shadow-sm ring-1 ${p.ring} transition-all duration-300 group-hover:scale-[1.08] group-hover:rotate-[2deg] group-hover:shadow-md`}
      >
        <span className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" aria-hidden>
          {category.icon}
        </span>
      </div>

      <h3 className="mt-4 text-[15px] font-extrabold tracking-tight text-navy-800">{category.name}</h3>
      <p className="mx-auto mt-1.5 line-clamp-2 max-w-[16ch] text-xs leading-relaxed text-slate-500">
        {category.tagline}
      </p>

      {/* Hover reveal */}
      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-[11px] font-bold tracking-wide text-navy-700 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
        Explore <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>

      {/* Count */}
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-black/[0.06] opacity-0 transition-opacity group-hover:opacity-100">
        {category.items.length}
      </span>
    </Link>
  );
}

export function ServiceTileDetailed({ category }: { category: ServiceCategory }) {
  const p = pastelFor(category.slug);
  return (
    <article className="group relative flex flex-col items-center overflow-hidden rounded-[1.9rem] border border-black/[0.04] bg-white p-7 text-center shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      {/* Glow */}
      <div
        className={`pointer-events-none absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-full blur-2xl opacity-0 transition-all duration-500 group-hover:opacity-70 ${p.glow}`}
        aria-hidden
      />

      <div
        className={`relative mx-auto grid h-[84px] w-[84px] place-items-center rounded-[1.6rem] bg-gradient-to-br ${p.bg} text-[38px] shadow-sm ring-1 ${p.ring} transition-all duration-300 group-hover:scale-[1.06] group-hover:rotate-[2deg]`}
      >
        <span className="transition-transform duration-300 group-hover:scale-110" aria-hidden>
          {category.icon}
        </span>
      </div>

      <h2 className="mt-5 text-[17px] font-extrabold tracking-tight text-navy-800">{category.name}</h2>
      <p className="mt-1.5 max-w-[22ch] text-[13px] leading-relaxed text-slate-500">{category.tagline}</p>

      <ul className="mt-5 flex flex-wrap justify-center gap-1.5">
        {category.items.slice(0, 6).map((item) => (
          <li
            key={item}
            className="rounded-full bg-mist px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-black/[0.03] transition-colors group-hover:bg-white"
          >
            {item}
          </li>
        ))}
        {category.items.length > 6 ? (
          <li className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-bold text-navy-700">+{category.items.length - 6}</li>
        ) : null}
      </ul>

      <div className="mt-auto flex w-full gap-2 pt-6">
        <Link href={`/services/${category.slug}`} className="btn btn-ghost flex-1 !px-3 !py-2.5 text-xs">
          View pros
        </Link>
        <Link href={`/post-job?category=${category.slug}`} className="btn btn-accent flex-1 !px-3 !py-2.5 text-xs">
          Get quotes
        </Link>
      </div>
    </article>
  );
}
