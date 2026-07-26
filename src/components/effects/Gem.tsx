"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL } from "@/lib/webgl";

/**
 * Gates the gem behind the same four checks the hero uses. Without WebGL it
 * falls back to a flat faceted octahedron in SVG, so the column is never empty
 * and three.js is never fetched on a phone.
 */

const GemScene = dynamic(
  () =>
    // A failed chunk load would otherwise reach the nearest error boundary and
    // take the page down over a decorative element.
    import("@/components/effects/GemScene").catch(() => ({
      default: () => null,
    })),
  { ssr: false, loading: () => null }
);

/**
 * Flat elevation of the same cut: table across the top, crown angling out to
 * the girdle, pavilion dropping to the culet — the brilliant silhouette, so the
 * fallback is recognisably the same object.
 */
function StaticGem() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        className="h-[76%] w-[76%]"
        fill="none"
        stroke="var(--ink)"
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Crown: table edge out to the girdle. */}
        <polygon points="62,56 138,56 178,86 22,86" fill="var(--paper-deep)" />
        {/* Pavilion: girdle down to the point. */}
        <polygon points="22,86 178,86 100,178" fill="var(--paper-deep)" />
        {/* Facet lines. */}
        <path d="M62,56 L22,86 M138,56 L178,86 M100,56 L100,86" />
        <path d="M22,86 L100,178 M178,86 L100,178" />
        <path d="M61,86 L100,178 M139,86 L100,178 M100,86 L100,178" />
      </svg>
    </div>
  );
}

export function Gem({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      window.matchMedia("(min-width: 768px) and (pointer: fine)").matches &&
        !prefersReducedMotion() &&
        canUseWebGL()
    );
  }, []);

  return (
    <div className={className} aria-hidden="true">
      {enabled ? <GemScene /> : <StaticGem />}
    </div>
  );
}
