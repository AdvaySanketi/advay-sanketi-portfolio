"use client";

import { useEffect, useState } from "react";

import type { TocEntry } from "@/lib/toc";

/**
 * Sticky table of contents with scrollspy.
 *
 * Uses IntersectionObserver against a band near the top of the viewport rather
 * than scroll-position maths, so it stays correct regardless of Lenis's
 * interpolated scroll position.
 */
export function ArticleToc({ entries }: { entries: TocEntry[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(
    entries[0]?.slug ?? null
  );

  useEffect(() => {
    if (!entries.length) return;

    const headings = entries
      .map((entry) => document.getElementById(entry.slug))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) setActiveSlug(visible[0].target.id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav aria-label="On this page" className="sticky top-28">
      <p className="label pb-4">Contents</p>
      <ul className="flex flex-col gap-2.5">
        {entries.map((entry) => {
          const active = entry.slug === activeSlug;
          return (
            <li key={entry.slug}>
              <a
                href={`#${entry.slug}`}
                className={`flex items-baseline gap-3 text-sm transition-colors duration-300 ${
                  active ? "text-ink" : "text-faint hover:text-ink"
                }`}
              >
                <span
                  className={`mt-2 h-px shrink-0 bg-current transition-all duration-500 ease-expo ${
                    active ? "w-6" : "w-2.5"
                  }`}
                />
                <span>{entry.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
