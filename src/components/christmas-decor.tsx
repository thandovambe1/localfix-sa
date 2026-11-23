"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Festive announcement bar shown at the very top of every page.
 * Includes a live countdown to Christmas (client-side, so no hydration mismatch).
 */
export function ChristmasBanner() {
  const [days, setDays] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    let christmas = new Date(year, 11, 25);
    // After Boxing Day, count down to next year's Christmas.
    if (now > new Date(year, 11, 26, 23, 59, 59)) {
      christmas = new Date(year + 1, 11, 25);
    }
    const diffMs = christmas.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    setDays(Math.max(0, Math.round(diffMs / 86_400_000)));
  }, []);

  if (dismissed) return null;

  const countdown =
    days === null
      ? "Festive Season is here"
      : days === 0
        ? "Merry Christmas from LocalFix SA"
        : `${days} day${days === 1 ? "" : "s"} to Christmas`;

  return (
    <div
      role="note"
      aria-label="Festive season announcement"
      className="christmas-banner relative overflow-hidden text-white print:hidden"
    >
      <div className="container-page flex flex-col items-center justify-center gap-2 py-2.5 text-center sm:flex-row sm:gap-4">
        <p className="text-[13px] font-bold leading-snug sm:text-sm">
          <span aria-hidden>🎄</span> {countdown} — Emergency pros on call 24/7 through the holidays{" "}
          <span aria-hidden>✨</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/post-job"
            className="rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-red-700 shadow transition hover:-translate-y-0.5 hover:shadow-md"
          >
            🎁 Book a Festive Fix
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss festive announcement"
            className="grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

type Flake = {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  opacity: number;
};

/**
 * Lightweight full-viewport snowfall overlay.
 * Pointer-events disabled so it never blocks clicks; respects reduced-motion.
 */
export function ChristmasSnowfall({ density = 120 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];

    const seed = () => {
      const count = Math.min(density, Math.max(40, Math.floor(w / 12)));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2.6,
        speed: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.35 + Math.random() * 0.55,
      }));
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      seed();
    };

    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.speed;
        f.x += Math.sin((f.y + f.phase * 60) / 45) * 0.45;
        if (f.y > h + 6) {
          f.y = -6;
          f.x = Math.random() * w;
        }
        const twinkle = f.opacity + Math.sin(t / 600 + f.phase) * 0.18;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.15, Math.min(0.95, twinkle)).toFixed(2)})`;
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] h-screen w-screen"
    />
  );
}

const BULB_COLORS = ["#ef4444", "#fbbf24", "#22c55e", "#38bdf8", "#f472b6", "#ffffff"];

/**
 * A string of hanging, twinkling Christmas lights.
 * Purely decorative — hidden from assistive tech and print.
 */
export function ChristmasLights({ count = 24, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex items-start justify-center gap-2 overflow-hidden print:hidden sm:gap-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => {
        const color = BULB_COLORS[i % BULB_COLORS.length];
        return (
          <span key={i} className="flex shrink-0 flex-col items-center">
            <span className="h-2.5 w-px bg-slate-400/70" />
            <span
              className="christmas-bulb"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 10px 2px ${color}`,
                animationDelay: `${((i * 0.35) % 3).toFixed(2)}s`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
