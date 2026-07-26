"use client";

import { useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { SplitText } from "@/components/Reveal";
import { HeroName } from "@/components/hero/NameFlow";
import { HeroTicker } from "@/components/hero/HeroTicker";
import { SceneMount } from "@/components/hero/SceneMount";
import { site } from "@/data/site";

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.to("[data-hero-type]", {
        yPercent: -18,
        opacity: 0.2,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      gsap.to("[data-hero-scene]", {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="hero-brush relative min-h-[100svh] overflow-hidden pb-10 pt-28"
    >
      {/*
        The scene and the left column are laid out inside one shell-aligned
        container so the cluster's inner edge lines up with the type, not the
        raw viewport. On desktop the canvas is absolute and full-bleed across
        the hero — the brush paints anywhere in the section — while the
        cluster composes itself into the right column from inside the scene
        (see SCENE_COLUMN in HeroCluster). On mobile it drops back into the
        flow beneath the name (`order-3`), where the WebGL gate has already
        swapped it for the static fallback.
      */}
      <div className="shell relative flex min-h-full flex-col gap-14 md:min-h-[calc(100svh-9.5rem)] md:justify-between md:gap-0">
        {/* The scene's cursor effects are driven by a window pointermove
            listener mapped to the canvas rect (see HeroCluster), so the type
            columns stacked above this layer can't starve it of events. */}
        <div
          data-hero-scene
          aria-hidden="true"
          className="relative z-0 order-3 aspect-[5/4] w-full md:absolute md:inset-0 md:order-none md:aspect-auto md:h-full md:w-full"
        >
          <SceneMount className="h-full w-full" />
        </div>

        <div className="relative z-10 order-1">
          <p className="label max-w-[16ch]">
            {site.role}
            <br />
            {site.location}
          </p>
        </div>

        <div className="relative z-10 order-2" data-hero-type>
          <div className="md:max-w-[46%]">
            <HeroName />

            <SplitText
              as="p"
              text={site.tagline}
              className="tagline mt-8 block max-w-[38ch]"
              trigger="preload"
              delay={0.5}
              stagger={0.02}
            />

            <HeroTicker />
          </div>
        </div>

        <div className="relative z-10 order-4">
          <a
            href="#work"
            data-cursor="Scroll"
            className="label flex items-center gap-3 transition-opacity hover:opacity-60"
          >
            <span className="inline-block h-8 w-px bg-ink/30" />
            Selected work
          </a>
        </div>
      </div>
    </section>
  );
}
