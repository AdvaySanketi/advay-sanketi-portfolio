import Link from "next/link";

import { Hero } from "@/components/hero/Hero";
import { Marquee } from "@/components/Marquee";
import { Reveal } from "@/components/Reveal";
import { ScrollText } from "@/components/ScrollText";
import { StatementBreak } from "@/components/StatementBreak";
import { Gem } from "@/components/effects/Gem";
import { HorizontalRail } from "@/components/HorizontalRail";
import { ProjectList } from "@/components/projects/ProjectList";
import { getProjects, getProjectsBySlug, formatYear } from "@/lib/projects";
import { site, skills } from "@/data/site";

export default function HomePage() {
  const featured = getProjectsBySlug([...site.featuredProjects]);
  const total = getProjects().length;

  const items = featured.map((project) => ({
    slug: project.slug,
    title: project.metadata.title,
    stack: project.metadata.stack,
    summary: project.metadata.summary,
    year: formatYear(project.metadata.publishedAt),
    image: project.metadata.images[0],
  }));

  const marqueeItems = skills.flatMap((skill) => skill.tags).slice(0, 18);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: site.name,
            jobTitle: site.role,
            description: site.description,
            url: site.url,
            image: `${site.url}${site.avatar}`,
          }),
        }}
      />

      <Hero />

      <Marquee
        items={marqueeItems}
        duration={44}
        className="label border-y border-rule py-4 text-ink"
      />

      {/* ---------------------------------------------------- Selected work */}
      <section id="work" className="shell scroll-mt-24 pt-24 md:pt-36">
        <Reveal className="flex items-end justify-between gap-6 pb-10">
          <h2 className="label">Selected work</h2>
          <span className="label">
            {String(featured.length).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
        </Reveal>

        <ProjectList items={items} />

        <Reveal className="pt-12" delay={0.1}>
          <Link
            href="/projects"
            data-cursor="Open"
            className="link-wipe display-sm inline-block"
          >
            All projects →
          </Link>
        </Reveal>
      </section>

      {/* Colour inversion, mid-page. */}
      <StatementBreak
        eyebrow="Why I build"
        text="Working towards a future with a higher promise."
      />

      {/* ----------------------------------------------------------- About */}
      <section className="shell pt-32 md:pt-48">
        <Reveal>
          <p className="label pb-10">About</p>
        </Reveal>

        <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start md:gap-16">
          <ScrollText
            text={site.intro[2]}
            className="display-sm font-display leading-[1.15]"
          />

          <Gem className="aspect-square w-full md:sticky md:top-28" />
        </div>

        <div className="mt-16 grid gap-10 border-t border-rule pt-10 md:grid-cols-3">
          {[
            { value: "30+", label: "Projects shipped" },
            { value: "9.15", label: "CGPA, PES University" },
            { value: "7+", label: "Years writing code" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08}>
              <p className="display-sm">{stat.value}</p>
              <p className="label mt-2">{stat.label}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="pt-12" delay={0.1}>
          <Link
            href="/about"
            data-cursor="Open"
            className="link-wipe display-sm inline-block"
          >
            More about me →
          </Link>
        </Reveal>
      </section>

      {/* Pinned horizontal rail. */}
      <HorizontalRail items={skills} />
    </>
  );
}
