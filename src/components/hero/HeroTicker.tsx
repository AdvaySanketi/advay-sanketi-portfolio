"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/gsap";
import { site } from "@/data/site";

const PERIOD = 3200;
const DECODE_MS = 650;
const GLYPHS = "abcdefghikmnorstuvwx23479#&*+-";

export function HeroTicker() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState<string>(site.currently[0]);
  const mounted = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % site.currently.length),
      PERIOD
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const target = site.currently[index];
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DECODE_MS);
      const settled = Math.floor(progress * target.length);
      let out = target.slice(0, settled);
      for (let i = settled; i < target.length; i++) {
        out +=
          target[i] === " "
            ? " "
            : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setText(out);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index]);

  return (
    <p className="hero-ticker tagline mt-7">
      <span className="label mr-3">Currently</span>
      <span className="sr-only">{site.currently[index]}</span>
      <span aria-hidden="true">{text}</span>
    </p>
  );
}
