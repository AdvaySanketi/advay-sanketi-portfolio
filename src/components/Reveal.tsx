"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { PRELOAD_DONE_EVENT, isPreloadDone } from "@/lib/preload";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  y?: number;
  start?: string;
};

export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay = 0,
  y = 40,
  start = "top 85%",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          delay,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start, once: true },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay, y, start]);

  return (
    <Tag ref={ref as never} data-reveal className={className}>
      {children}
    </Tag>
  );
}

type SplitTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  start?: string;
  trigger?: "scroll" | "mount" | "preload";
};

export function SplitText({
  text,
  as: Tag = "span",
  className,
  delay = 0,
  stagger = 0.045,
  start = "top 85%",
  trigger = "scroll",
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ").filter(Boolean);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-word-inner]");
    if (!targets.length) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1 });
      gsap.set(targets, { yPercent: 0 });
      return;
    }

    let ctx: gsap.Context | undefined;

    const play = () => {
      ctx = gsap.context(() => {
        gsap.set(el, { opacity: 1 });

        const tween = {
          yPercent: 0,
          duration: 1.15,
          delay,
          stagger,
          ease: "expo.out",
        };

        gsap.fromTo(
          targets,
          { yPercent: 115 },
          trigger === "scroll"
            ? { ...tween, scrollTrigger: { trigger: el, start, once: true } }
            : tween
        );
      }, el);
    };

    if (trigger === "preload" && !isPreloadDone()) {
      window.addEventListener(PRELOAD_DONE_EVENT, play, { once: true });
      return () => {
        window.removeEventListener(PRELOAD_DONE_EVENT, play);
        ctx?.revert();
      };
    }

    play();
    return () => ctx?.revert();
  }, [text, delay, stagger, start, trigger]);

  return (
    <Tag ref={ref as never} data-reveal className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          style={{
            display: "inline-block",
            maxWidth: "100%",
            overflow: "hidden",
            verticalAlign: "bottom",
            paddingBottom: "0.14em",
            marginRight: i < words.length - 1 ? "0.26em" : undefined,
          }}
        >
          <span
            data-word-inner
            style={{ display: "inline-block", maxWidth: "100%" }}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
