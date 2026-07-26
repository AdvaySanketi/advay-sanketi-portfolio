"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/gsap";
import { site } from "@/data/site";

/**
 * The "currently" line under the hero tagline: one facet at a time, on a slow
 * rotation. It fills the dead space between the tagline and the scroll cue on
 * tall screens with something alive but quiet.
 *
 * Each new entry decodes in: characters resolve left to right out of a
 * scramble, terminal-style — at home in the mono register this line is set
 * in. Reduced motion never starts the rotation and simply pins the first
 * entry. The scrambling span is aria-hidden with a static text alternative,
 * so screen readers hear the line once instead of sixty times a second.
 */
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
    // The first entry arrives with the ticker's own fade-in; decoding it too
    // would run the effect while the line is still invisible.
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
        // Spaces hold, so the words' shapes are legible mid-decode.
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
