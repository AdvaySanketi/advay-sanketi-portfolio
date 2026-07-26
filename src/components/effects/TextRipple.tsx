"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/gsap";

export function TextRipple({
  children,
  className,
  radius = 220,
}: {
  children: ReactNode;
  className?: string;
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
