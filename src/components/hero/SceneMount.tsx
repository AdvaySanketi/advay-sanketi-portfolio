"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL } from "@/lib/webgl";

/**
 * Decides whether the hero's 3D scene should exist at all, and only then pulls
 * it over the network.
 *
 * Gated on a wide viewport, a fine pointer, real WebGL support, and motion not
 * being reduced. If any check fails three.js is never downloaded, because the
 * dynamic import sits behind the state flag — and nothing is rendered in its
 * place: the hero simply carries the type on the left with open space on the
 * right, rather than a 2D stand-in that never matched the live scene.
 *
 * Currently mounts the floating object cluster (HeroCluster); the particle
 * reel it replaced is kept intact in HeroScene.tsx — swap the import path to
 * bring it back.
 */

const HeroScene = dynamic(
  () =>
    // A failed chunk load would otherwise reach the nearest error boundary and
    // take the page down over a decorative element.
    import("@/components/hero/HeroCluster").catch(() => ({
      default: () => null,
    })),
  { ssr: false, loading: () => null }
);

export function SceneMount({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(
      window.matchMedia("(min-width: 768px) and (pointer: fine)").matches &&
        !prefersReducedMotion() &&
        canUseWebGL()
    );
  }, []);

  return <div className={className}>{enabled ? <HeroScene /> : null}</div>;
}
