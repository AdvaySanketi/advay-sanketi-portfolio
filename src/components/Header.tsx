"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { nav, site, socials } from "@/data/site";
import { Magnetic } from "@/components/Magnetic";

/**
 * Header that hides on scroll-down and returns on scroll-up, plus a full-screen
 * menu on small viewports.
 */
export function Header() {
  const pathname = usePathname();
  const barRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Hide-on-scroll-down.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;

    let lastY = window.scrollY;
    let hidden = false;

    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY;

      if (goingDown && y > 160 && !hidden) {
        hidden = true;
        gsap.to(bar, { yPercent: -140, duration: 0.6, ease: "power3.out" });
      } else if (!goingDown && hidden) {
        hidden = false;
        gsap.to(bar, { yPercent: 0, duration: 0.6, ease: "power3.out" });
      }
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll and trap Escape while the menu is open.
  useEffect(() => {
    if (!open) return;

    document.documentElement.classList.add("lenis-stopped");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const panel = menuRef.current;
    if (panel && !prefersReducedMotion()) {
      gsap.fromTo(
        panel.querySelectorAll("[data-menu-item]"),
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "expo.out" }
      );
    }

    return () => {
      document.documentElement.classList.remove("lenis-stopped");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        ref={barRef}
        className="fixed inset-x-0 top-0 z-50 mix-blend-difference"
      >
        <div className="shell flex items-center justify-between py-6 text-paper">
          <Link
            href="/"
            className="label text-paper transition-opacity hover:opacity-60"
            data-cursor="Home"
          >
            {site.name}
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Magnetic key={item.href} strength={0.25}>
                  <Link
                    href={item.href}
                    className="label group flex items-baseline gap-2 text-paper"
                  >
                    <span className="opacity-40">{item.index}</span>
                    <span className="link-wipe">{item.label}</span>
                    <span
                      className={`h-1 w-1 rounded-full bg-paper transition-opacity ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </Link>
                </Magnetic>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="label text-paper md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {open && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-40 flex flex-col justify-between bg-ink px-[var(--shell-x)] pb-10 pt-28 text-paper md:hidden"
        >
          <nav className="flex flex-col gap-2">
            {nav.map((item) => (
              <div key={item.href} className="overflow-hidden">
                <Link
                  href={item.href}
                  data-menu-item
                  className="display-sm block text-paper"
                >
                  {item.label}
                </Link>
              </div>
            ))}
          </nav>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {socials.map((social) => (
              <a
                key={social.name}
                href={social.link}
                target="_blank"
                rel="noopener noreferrer"
                className="label text-paper opacity-60"
              >
                {social.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
