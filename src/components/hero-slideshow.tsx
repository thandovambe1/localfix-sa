"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDE_DURATION_MS = 30_000;

const HERO_SLIDES = [
  {
    src: "/images/localfix-hero.png",
    alt: "Verified LocalFix SA professional ready to help at a modern South African home",
  },
  {
    src: "/images/localfix-hero-3.png",
    alt: "South African home service professionals collaborating in a bright modern kitchen",
  },
  {
    src: "/images/localfix-provider-hero.png",
    alt: "LocalFix SA service provider reviewing a job at a modern South African home",
  },
  {
    src: "/images/localfix-hero-5.png",
    alt: "Professional South African electrician checking a modern home's electrical installation",
  },
  {
    src: "/images/localfix-hero-6.png",
    alt: "Homeowner and LocalFix SA professional reviewing completed home maintenance work",
  },
  {
    src: "/images/localfix-hero-4.png",
    alt: "South African technician inspecting solar panels at a modern suburban home",
  },
] as const;

/**
 * Home-page visual slideshow.
 * Every slide remains visible for exactly 30 seconds before cross-fading to
 * the next persistent image in /public/images. No API, database or external
 * storage dependency is involved, so it works identically after Vercel deploy.
 */
export default function HeroSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="group relative h-[320px] w-full overflow-hidden rounded-[2rem] border border-black/[0.05] shadow-[0_24px_60px_rgba(41,66,111,0.16),_0_4px_14px_rgba(41,66,111,0.06)] sm:h-[440px] lg:h-[500px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="LocalFix SA home services"
    >
      {HERO_SLIDES.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={index === activeIndex ? slide.alt : ""}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 46vw"
          quality={92}
          className={`object-cover object-center transition-opacity duration-700 ease-in-out ${
            index === activeIndex ? "z-10 opacity-100" : "z-0 opacity-0"
          }`}
        />
      ))}

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-navy-900/30 via-transparent to-transparent" />

      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-navy-900/65 px-3 py-2 backdrop-blur-sm">
        {HERO_SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              index === activeIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Show hero image ${index + 1} of ${HERO_SLIDES.length}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}

        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="ml-1 grid h-6 w-6 place-items-center rounded-full text-xs text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={paused ? "Play hero slideshow" : "Pause hero slideshow"}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
      </div>
    </div>
  );
}
