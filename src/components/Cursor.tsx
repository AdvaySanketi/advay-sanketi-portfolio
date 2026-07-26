"use client";

import { useEffect, useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
      .matches;
    if (!isFinePointer || prefersReducedMotion()) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const setDotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    const setDotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    const setRingX = gsap.quickTo(ring, "x", { duration: 0.55, ease: "power3" });
    const setRingY = gsap.quickTo(ring, "y", { duration: 0.55, ease: "power3" });

    const onMove = (event: PointerEvent) => {
      setDotX(event.clientX);
      setDotY(event.clientY);
      setRingX(event.clientX);
      setRingY(event.clientY);
    };

    const onOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor], a, button"
      );
      if (!target) return;

      ring.dataset.active = "true";
      gsap.to(ring, { scale: 1.45, duration: 0.45 });
      gsap.to(dot, { scale: 0, duration: 0.35 });
    };

    const onOut = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor], a, button"
      );
      if (!target) return;

      ring.dataset.active = "false";
      gsap.to(ring, { scale: 1, duration: 0.45 });
      gsap.to(dot, { scale: 1, duration: 0.35 });
    };

    gsap.set([dot, ring], { opacity: 1 });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>
  );
}
