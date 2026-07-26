import type { Metadata } from "next";

import { ProjectIndex } from "@/components/projects/ProjectIndex";
import { Reveal, SplitText } from "@/components/Reveal";
import { getProjects, getStacks, formatYear } from "@/lib/projects";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Work",
  description: `Projects by ${site.name} — AI systems, developer tools, and cross-platform apps.`,
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const projects = getProjects();
  const stacks = getStacks();

  const items = projects.map((project) => ({
    slug: project.slug,
    title: project.metadata.title,
    stack: project.metadata.stack,
    summary: project.metadata.summary,
    year: formatYear(project.metadata.publishedAt),
    image: project.metadata.images[0],
  }));

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            headline: "Work",
            description: `Projects by ${site.name}`,
            url: `${site.url}/projects`,
            hasPart: projects.map((project) => ({
              "@type": "CreativeWork",
              headline: project.metadata.title,
              description: project.metadata.summary,
              url: `${site.url}/projects/${project.slug}`,
            })),
          }),
        }}
      />

      <section className="shell pt-36 md:pt-48">
        <div className="flex items-end justify-between gap-6 pb-12">
          <SplitText as="h1" text="Work" className="display block" trigger="mount" />
          <span className="label pb-4">
            {String(projects.length).padStart(2, "0")} projects
          </span>
        </div>

        <Reveal>
          <ProjectIndex items={items} stacks={stacks} />
        </Reveal>
      </section>
    </>
  );
}
