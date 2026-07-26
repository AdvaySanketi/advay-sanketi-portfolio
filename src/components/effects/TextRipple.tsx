"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/gsap";

/**
 * A cursor wake that distorts text.
 *
 * Two stacked copies of the same text: the base reads normally, and a warped
 * duplicate on top is revealed only through a soft circular mask that follows
 * the pointer. Where the cursor is, the letters bend; everywhere else they're
 * untouched.
 *
 * Built on an SVG displacement filter rather than WebGL on purpose:
 *   - The text stays real text — selectable, searchable, and read by screen
 *     readers. Rendering a headline into a canvas texture would lose all three.
 *   - The filter itself is static, so the browser rasterises it once. Only the
 *     mask position changes per frame, which is a compositor property. The
 *     usual way this effect gets slow is animating `baseFrequency`, forcing the
 *     whole filter to re-render every frame — this never does that.
 *   - No third WebGL context on a page that already has two.
 *
 * The duplicate is `aria-hidden`, so the text is announced exactly once.
 */
export function TextRipple({
  children,
  className,
  radius = 220,
}: {
  children: ReactNode;
  className?: string;
  /** Radius of the distorted region, in px. */
  radius?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      root.style.setProperty("--ripple-x", `${x}px`);
      root.style.setProperty("--ripple-y", `${y}px`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      // Park the mask far outside the box so nothing is distorted.
      root.style.setProperty("--ripple-x", "-9999px");
      root.style.setProperty("--ripple-y", "-9999px");
    };

    root.dataset.rippleReady = "true";
    window.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      delete root.dataset.rippleReady;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`text-ripple ${className ?? ""}`}
      style={{ "--ripple-r": `${radius}px` } as React.CSSProperties}
    >
      <RippleFilter />
      <div className="text-ripple__base">{children}</div>
      <div className="text-ripple__warp" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

/**
 * Filter definition. Static: `feTurbulence` generates a fixed noise field once
 * and `feDisplacementMap` pushes pixels along it. Rendered inline so the filter
 * travels with the component.
 */
function RippleFilter() {
  return (
    <svg className="text-ripple__defs" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="text-ripple-filter"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.016"
            numOctaves={2}
            seed={11}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={34}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
