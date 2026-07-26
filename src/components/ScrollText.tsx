"use client";

import { useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";

/**
 * A paragraph that inks in word by word as it passes through the viewport,
 * scrubbed directly to scroll position.
 *
 * Words start at low opacity rather than a different colour so the effect
 * degrades to plain readable text if the animation never runs.
 */
export function ScrollText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ").filter(Boolean);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-scroll-word]");
    if (!targets.length) return;

    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0.16 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.4,
          scrollTrigger: {
            trigger: el,
            start: "top 78%",
            end: "bottom 55%",
            scrub: 0.5,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [text]);

  return (
    <p ref={ref} className={className}>
      {/* Rendered at full opacity; GSAP sets the dimmed start state itself, so
          the text stays readable if the animation never runs. */}
      {words.map((word, i) => (
        <span key={`${word}-${i}`} data-scroll-word>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
