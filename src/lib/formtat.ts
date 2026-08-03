export function zar(value: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (value === null || value === undefined) return "—";
  if (opts.compact && value >= 1000) return `R${Math.round(value / 1000)}k`;
  return `R${Math.round(value).toLocaleString("en-ZA")}`;
}

export function timeAgo(date: Date | string | null | undefined) {
  if (!date) return "just now";
  const d = typeof date === "string" ? new Date(date) : date;
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function jobReference() {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `LFX-${n}`;
}
