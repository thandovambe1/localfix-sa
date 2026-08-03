import Link from "next/link";
import type { ReactNode } from "react";
import type { Provider } from "@/db/schema";
import { VERIFICATION_BADGES, categoryIcon, categoryName } from "@/lib/services";
import { num, zar } from "@/lib/format";

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-0.5 ${size === "md" ? "text-base" : "text-xs"}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "text-warn" : "text-slate-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

const TONES: Record<string, string> = {
  navy: "bg-navy-50 text-navy-700",
  teal: "bg-teal-50 text-teal-700",
  green: "bg-emerald-50 text-good",
  amber: "bg-amber-50 text-amber-700",
};

export function VerificationBadge({ id }: { id: string }) {
  const badge = VERIFICATION_BADGES[id];
  if (!badge) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[badge.tone]}`}>
      <span aria-hidden>{badge.icon}</span>
      {badge.label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-teal-50 text-teal-700",
    quoted: "bg-amber-50 text-amber-700",
    accepted: "bg-emerald-50 text-good",
    completed: "bg-slate-100 text-slate-600",
    active: "bg-emerald-50 text-good",
    pending: "bg-amber-50 text-amber-700",
    suspended: "bg-red-50 text-bad",
    submitted: "bg-navy-50 text-navy-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-600">{eyebrow}</p>
      ) : null}
      <h2 className="section-title">{title}</h2>
      {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-navy-800">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ProviderCard({ provider, distanceKm }: { provider: Provider; distanceKm?: number }) {
  return (
    <Link href={`/providers/${provider.id}`} className="card card-hover flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-black text-white"
          style={{ backgroundColor: provider.accent }}
          aria-hidden
        >
          {provider.businessName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-navy-800">{provider.businessName}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <Stars value={num(provider.rating)} />
            <span className="font-semibold text-slate-700">{num(provider.rating).toFixed(1)}</span>
            <span>({provider.reviewCount})</span>
            <span aria-hidden>·</span>
            <span>
              {provider.suburb ? `${provider.suburb}, ` : ""}
              {provider.city}
            </span>
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{provider.bio}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {provider.categories.slice(0, 3).map((c) => (
          <span key={c} className="chip">
            <span aria-hidden>{categoryIcon(c)}</span>
            {categoryName(c)}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.badges.slice(0, 3).map((b) => (
          <VerificationBadge key={b} id={b} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-slate-500">
        <span>⚡ Responds in ~{provider.responseMinutes} min</span>
        <span className="font-semibold text-navy-700">
          {distanceKm !== undefined ? `${distanceKm} km away` : `from ${zar(provider.hourlyRate)}/hr`}
        </span>
      </div>
    </Link>
  );
}

export function EmptyState({ title, body, action, icon = "🔍" }: { title: string; body: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="card grid place-items-center gap-2 p-10 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <h3 className="text-lg font-bold text-navy-800">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-slate-600">{body}</p>
      {action}
    </div>
  );
}
