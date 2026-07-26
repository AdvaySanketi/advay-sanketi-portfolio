"use client";

import { useRef } from "react";

import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import type { Skill } from "@/data/site";

/**
 * Capabilities as a pinned horizontal rail: the section sticks to the viewport
 * while vertical scroll drives the cards sideways.
 *
 * Set up inside `gsap.matchMedia`, so the pin only exists on wide viewports
 * with motion enabled. Everywhere else the same markup falls back to an
 * ordinary vertical stack — no pin, no transform, no horizontal overflow.
 *
 * `invalidateOnRefresh` recomputes the scroll distance from the track's real
 * width on every refresh; hard-coding it breaks the moment a font loads late
 * or the viewport changes.
 */
export function HorizontalRail({ items }: { items: Skill[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const distance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth + 96);

        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.7,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      }
    );

    return () => mm.revert();
  }, [items]);

  return (
    <div ref={rootRef} className="md:h-screen md:overflow-hidden">
      <div className="shell flex items-baseline justify-between gap-6 pb-10 pt-24 md:pt-32">
        <h2 className="label">Capabilities</h2>
        <span className="label">
          {String(items.length).padStart(2, "0")} disciplines
        </span>
      </div>

      <div
        ref={trackRef}
        className="flex flex-col gap-px bg-rule md:w-max md:flex-row md:pl-[var(--shell-x)]"
      >
        {items.map((skill, index) => (
          <article
            key={skill.title}
            className="flex flex-col justify-between bg-paper p-7 md:h-[26rem] md:w-[24rem] md:p-9"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="label text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="label">
                {String(items.length).padStart(2, "0")}
              </span>
            </div>

            <div>
              <h3 className="display-sm text-[clamp(1.5rem,2.2vw,2rem)]">
                {skill.title}
              </h3>
              <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-muted">
                {skill.description}
              </p>
            </div>

            <ul className="mt-6 flex flex-wrap gap-1.5">
              {skill.tags.map((tag) => (
                <li
                  key={tag}
                  className="label rounded-full border border-rule px-2.5 py-1"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
