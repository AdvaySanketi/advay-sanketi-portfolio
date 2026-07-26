"use client";

import { useEffect, useRef, useState } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { markPreloadDone } from "@/lib/preload";
import { site } from "@/data/site";

let decided = false;

export function Preloader() {
  const [enabled, setEnabled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (decided) return;
    decided = true;

    const seen = sessionStorage.getItem("preloaded") === "1";
    if (seen || prefersReducedMotion()) {
      markPreloadDone();
      return;
    }
    sessionStorage.setItem("preloaded", "1");
    document.documentElement.classList.add("lenis-stopped");
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const root = rootRef.current;
    const count = countRef.current;
    const bar = barRef.current;
    if (!root || !count || !bar) return;

    const progress = { value: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("lenis-stopped");
        markPreloadDone();
        setEnabled(false);
      },
    });

    tl.to(progress, {
      value: 100,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => {
        const v = Math.round(progress.value);
        count.textContent = String(v).padStart(3, "0");
        bar.style.transform = `scaleX(${progress.value / 100})`;
      },
    })
      .to(root.querySelectorAll("[data-preload-fade]"), {
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
      })
      .to(root, {
        yPercent: -100,
        duration: 1.1,
        ease: "expo.inOut",
      });

    const failsafe = window.setTimeout(() => {
      if (tl.isActive()) tl.progress(1);
      document.documentElement.classList.remove("lenis-stopped");
      markPreloadDone();
      setEnabled(false);
    }, 5000);

    return () => {
      window.clearTimeout(failsafe);
      tl.kill();
      document.documentElement.classList.remove("lenis-stopped");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-ink px-[var(--shell-x)] py-8 text-paper"
    >
      <div data-preload-fade className="label text-paper opacity-50">
        {site.name} — {site.role}
      </div>

      <div data-preload-fade className="flex items-end justify-between gap-6">
        <span className="font-display text-[clamp(4rem,16vw,12rem)] leading-[0.8]">
          <span ref={countRef}>000</span>
        </span>
        <span className="label pb-4 text-paper opacity-50">Loading</span>
      </div>

      <div className="h-px w-full bg-paper/20">
        <div
          ref={barRef}
          className="h-px w-full origin-left scale-x-0 bg-paper"
        />
      </div>
    </div>
  );
}
