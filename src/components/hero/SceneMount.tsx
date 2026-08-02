"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL, prefersHighQuality3D } from "@/lib/webgl";

const HeroScene = dynamic(
  () =>
    import("@/components/hero/HeroCluster").catch(() => ({
      default: () => null,
    })),
  { ssr: false, loading: () => null }
);

export function SceneMount({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    setEnabled(!prefersReducedMotion() && canUseWebGL());
    setLowPower(!prefersHighQuality3D());
  }, []);

  return (
    <div className={className}>
      {enabled ? <HeroScene lowPower={lowPower} /> : null}
    </div>
  );
}
