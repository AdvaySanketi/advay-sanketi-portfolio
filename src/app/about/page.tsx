import type { Metadata } from "next";

import { Reveal, SplitText } from "@/components/Reveal";
import { ScrollText } from "@/components/ScrollText";
import { site, socials, experiences, education, skills } from "@/data/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name} — ${site.role} based in ${site.location}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
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
            description: site.intro.join(" "),
            url: `${site.url}/about`,
            image: `${site.url}${site.avatar}`,
            address: { "@type": "PostalAddress", addressRegion: site.location },
            sameAs: socials
              .filter((s) => !s.link.startsWith("mailto:"))
              .map((s) => s.link),
            worksFor: {
              "@type": "Organization",
              name: experiences[0].company,
            },
          }),
        }}
      />

      {/* --------------------------------------------------------- Intro */}
      <section className="shell pt-24 md:pt-48">
        <SplitText
          as="h1"
          text="About"
          className="display hidden md:block"
          trigger="mount"
        />

        <div className="grid gap-12 md:mt-16 md:border-t md:border-rule md:pt-12 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-20">
          <Reveal>
            <div className="flex flex-col gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={site.avatar}
                alt={site.name}
                className="mx-auto block aspect-square w-32 rounded-full border border-rule object-cover md:mx-0 md:w-40"
              />

              <div className="grid grid-cols-2 gap-6 md:flex md:flex-col">
                <div>
                  <p className="label">Based in</p>
                  <p className="mt-1.5 text-sm">{site.location}</p>
                </div>
                <div>
                  <p className="label">Languages</p>
                  <p className="mt-1.5 text-sm">{site.languages.join(", ")}</p>
                </div>
              </div>

              <div>
                <p className="label">Elsewhere</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1.5 md:flex-col">
                  {socials.map((social) => (
                    <li key={social.name}>
                      <a
                        href={social.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-wipe text-sm"
                      >
                        {social.name} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
          
          <div className="flex flex-col gap-9">
            <ScrollText
              text={site.intro[0]}
              className="display-sm font-display leading-[1.2]"
            />

            <div className="flex max-w-prose flex-col gap-6">
              {site.intro.slice(1).map((paragraph, i) => (
                <Reveal key={i} delay={0.05 * (i + 1)}>
                  <p className="leading-relaxed text-muted">{paragraph}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Experience */}
      <Section title="Experience" id="experience">
        <div className="flex flex-col">
          {experiences.map((experience, i) => (
            <Reveal
              key={experience.company}
              delay={i * 0.05}
              className="grid gap-4 border-t border-rule py-10 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-16"
            >
              <div>
                <h3 className="text-xl font-medium">{experience.company}</h3>
                <p className="label mt-2">{experience.timeframe}</p>
              </div>

              <div className="max-w-prose">
                <p className="font-display text-2xl">{experience.role}</p>

                {experience.achievements.length > 0 ? (
                  <ul className="mt-5 flex flex-col gap-3">
                    {experience.achievements.map((point) => (
                      <li
                        key={point}
                        className="relative pl-6 text-sm leading-relaxed text-muted before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-accent"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {experience.roles?.map((role) => (
                  <div key={role.title} className="mt-9">
                    <p className="font-medium">{role.title}</p>
                    <p className="mt-1 text-sm text-accent">{role.org}</p>
                    <p className="label mt-1">{role.timeframe}</p>
                    <ul className="mt-4 flex flex-col gap-3">
                      {role.points.map((point) => (
                        <li
                          key={point}
                          className="relative pl-6 text-sm leading-relaxed text-muted before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2.5 before:bg-accent"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {experience.images.length > 0 ? (
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {experience.images.map((image) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={image.src}
                        src={image.src}
                        alt={image.alt}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[16/9] w-full rounded-sm border border-rule object-cover transition-transform duration-700 ease-expo hover:scale-[1.02]"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------- Education */}
      <Section title="Education" id="education">
        <div className="flex flex-col">
          {education.map((institution, i) => (
            <Reveal
              key={institution.name}
              delay={i * 0.05}
              className="grid gap-3 border-t border-rule py-8 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] md:items-baseline md:gap-16"
            >
              <h3 className="text-xl font-medium">{institution.name}</h3>
              <div>
                <p className="text-sm text-muted">{institution.qualification}</p>
                <p className="label mt-1.5">{institution.timeframe}</p>
              </div>
              <p className="font-display text-2xl">{institution.result}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------- Skills */}
      <Section title="Technical skills" id="skills">
        <div className="grid gap-px border-t border-rule bg-rule sm:grid-cols-2">
          {skills.map((skill, i) => (
            <Reveal
              key={skill.title}
              delay={(i % 2) * 0.06}
              className="bg-paper p-7"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-medium">{skill.title}</h3>
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {skill.description}
              </p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {skill.tags.map((tag) => (
                  <li
                    key={tag}
                    className="label rounded-full border border-rule px-2.5 py-1"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="shell scroll-mt-24 pt-28 md:pt-40">
      <Reveal>
        <h2 className="label pb-8">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}
