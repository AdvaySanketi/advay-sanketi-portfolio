import Link from "next/link";

import { site, socials } from "@/data/site";
import { Reveal, SplitText } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-32 bg-ink text-paper">
      <Marquee
        items={["Let's build something", "Open to opportunities", "Say hello"]}
        duration={30}
        className="display-sm border-b border-paper/10 py-6 font-display text-paper"
      />

      <div className="shell py-20 md:py-28">
        <Reveal>
          <p className="label text-paper opacity-40">Get in touch</p>
        </Reveal>

        <a
          href={`mailto:${site.email}`}
          data-cursor="Copy"
          className="mt-6 block"
        >
          <SplitText
            as="span"
            text={site.email}
            className="display-email block break-words text-paper"
          />
        </a>

        <div className="rule mt-20 border-paper/15 pt-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label link-wipe text-paper opacity-70 transition-opacity hover:opacity-100"
                >
                  {social.name}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/projects" className="label text-paper opacity-70">
                Work
              </Link>
              <Link href="/about" className="label text-paper opacity-70">
                About
              </Link>
              <span className="label text-paper opacity-40">
                © {year} {site.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
