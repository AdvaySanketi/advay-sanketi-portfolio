import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Mdx } from "@/components/mdx/Mdx";
import { ArticleToc } from "@/components/mdx/ArticleToc";
import { ReadingProgress } from "@/components/ReadingProgress";
import { Reveal, SplitText } from "@/components/Reveal";
import { getProject, getProjects, formatDate } from "@/lib/projects";
import { getToc } from "@/lib/toc";
import { site } from "@/data/site";

type Params = { params: { slug: string } };

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const project = getProject(params.slug);
  if (!project) return {};

  const { title, summary, images, publishedAt } = project.metadata;
  const ogImage = images[0] ?? `/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description: summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title,
      description: summary,
      publishedTime: publishedAt,
      url: `${site.url}/projects/${project.slug}`,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: [ogImage],
    },
  };
}

export default function ProjectPage({ params }: Params) {
  const project = getProject(params.slug);
  if (!project) notFound();

  const all = getProjects();
  const index = all.findIndex((item) => item.slug === project.slug);
  const next = all[(index + 1) % all.length];

  const { title, stack, summary, images, publishedAt, github, team } =
    project.metadata;
  const toc = getToc(project.content);
  const [name, ...rest] = title.split(/\s+[–-]\s+/);
  const subtitle = rest.join(" — ");

  return (
    <>
      <ReadingProgress />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            headline: title,
            datePublished: publishedAt,
            description: summary,
            url: `${site.url}/projects/${project.slug}`,
            author: { "@type": "Person", name: site.name },
          }),
        }}
      />

      {/* ---------------------------------------------------------- Header */}
      <header className="shell pt-24 md:pt-44">
        <Link href="/projects" className="label link-wipe inline-block">
          ← Work
        </Link>

        <SplitText
          as="h1"
          text={name}
          className="display mt-8 block"
          trigger="mount"
        />

        {subtitle ? (
          <Reveal delay={0.2}>
            <p className="lede mt-5 max-w-[46ch] font-display italic">
              {subtitle}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={0.3}>
          <dl className="mt-14 grid gap-x-8 gap-y-6 border-t border-rule pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="label">Stack</dt>
              <dd className="mt-2 text-sm leading-relaxed">{stack}</dd>
            </div>
            <div>
              <dt className="label">Published</dt>
              <dd className="mt-2 text-sm">{formatDate(publishedAt)}</dd>
            </div>
            <div>
              <dt className="label">Role</dt>
              <dd className="mt-2 text-sm">{team[0]?.role ?? "Software Engineer"}</dd>
            </div>
            <div>
              <dt className="label">Source</dt>
              <dd className="mt-2 text-sm">
                {github ? (
                  <a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-wipe"
                    data-cursor="GitHub"
                  >
                    GitHub ↗
                  </a>
                ) : (
                  <span className="text-faint">Private</span>
                )}
              </dd>
            </div>
          </dl>
        </Reveal>
      </header>

      {/* ----------------------------------------------------------- Cover */}
      {images[0] ? (
        <Reveal className="shell mt-16" y={60}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt={title}
            className="aspect-[16/9] w-full rounded-sm border border-rule object-cover"
          />
        </Reveal>
      ) : null}

      {/* --------------------------------------------------------- Article */}
      <div className="shell mt-20 grid gap-14 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-20">
        <aside className="hidden lg:block">
          <ArticleToc entries={toc} />
        </aside>

        <article className="max-w-prose">
          <p className="lede border-l-2 border-accent pl-6 text-ink">{summary}</p>
          <div className="mt-14">
            <Mdx source={project.content} />
          </div>
        </article>
      </div>

      {/* -------------------------------------------------------- Next up */}
      {next && next.slug !== project.slug ? (
        <section className="shell mt-32 border-t border-rule pt-10">
          <p className="label">Next project</p>
          <Link
            href={`/projects/${next.slug}`}
            data-cursor="Open"
            className="group mt-4 block"
          >
            <span className="display-sm block transition-transform duration-700 ease-expo group-hover:translate-x-3">
              {next.metadata.title.split(/\s+[–-]\s+/)[0]} →
            </span>
            <span className="label mt-3 block">{next.metadata.stack}</span>
          </Link>
        </section>
      ) : null}
    </>
  );
}
