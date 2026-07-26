"use client";

import { useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";

/**
 * Full-bleed ink panel that breaks up the paper. The section grows from a
 * rounded, inset card to the full width of the viewport as it scrolls through,
 * so the colour inversion arrives as a movement rather than a hard cut.
 *
 * The words then ink in on their own scrub, one beat behind the panel.
 */
export function StatementBreak({
  eyebrow,
  text,
}: {
  eyebrow: string;
  text: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const words = text.split(" ").filter(Boolean);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (prefersReducedMotion()) {
      gsap.set(root.querySelectorAll("[data-statement-word]"), { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-statement-panel]",
        { scaleX: 0.86, borderRadius: "1.5rem" },
        {
          scaleX: 1,
          borderRadius: "0rem",
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 90%",
            end: "top 35%",
            scrub: 0.6,
          },
        }
      );

      gsap.fromTo(
        "[data-statement-word]",
        { opacity: 0.18 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.4,
          scrollTrigger: {
            trigger: root,
            start: "top 62%",
            end: "bottom 70%",
            scrub: 0.5,
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, [text]);

  return (
    <section ref={rootRef} className="mt-32 md:mt-48">
      <div
        data-statement-panel
        className="origin-center bg-ink py-24 text-paper md:py-36"
      >
        <div className="shell">
          <p className="label text-paper opacity-40">{eyebrow}</p>
          <p className="display mt-8 max-w-[14ch] font-display">
            {words.map((word, i) => (
              <span key={`${word}-${i}`} data-statement-word>
                {word}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
