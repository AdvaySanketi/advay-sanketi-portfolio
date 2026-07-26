"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { prefersReducedMotion } from "@/lib/gsap";
import { canUseWebGL } from "@/lib/webgl";

const HeroScene = dynamic(
  () =>
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
