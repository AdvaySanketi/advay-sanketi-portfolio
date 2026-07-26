import Link from "next/link";

export type ProjectListItem = {
  slug: string;
  title: string;
  stack: string;
  summary: string;
  year: string;
  image?: string;
};

/**
 * The project index as a typographic list.
 *
 * Hovering a row dims its siblings and expands that row to reveal the summary,
 * with an accent rule drawing across underneath. Deliberately no preview
 * imagery: the generated covers added nothing a reader wanted, and a floating
 * panel that follows the cursor sits on top of the very text it is describing.
 *
 * All of it is CSS (see `.project-row` in globals.css), so this stays a server
 * component and ships no JavaScript. `:focus-visible` mirrors every hover rule,
 * so keyboard users get the same reveal.
 */
export function ProjectList({ items }: { items: ProjectListItem[] }) {
  if (!items.length) {
    return (
      <p className="label py-16 text-center">No projects match that filter.</p>
    );
  }

  return (
    <ul className="project-list rule">
      {items.map((item, index) => (
        <li key={item.slug}>
          <Link
            href={`/projects/${item.slug}`}
            data-cursor="View"
            className="project-row group relative block border-b border-rule py-7 md:py-9"
          >
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-5 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,16rem)_4rem] md:gap-x-8">
              <span className="label transition-colors duration-500 group-hover:text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="display-sm text-[clamp(1.6rem,3.4vw,2.9rem)] transition-transform duration-700 ease-expo group-hover:translate-x-2">
                {item.title.split(" - ")[0].split(" – ")[0]}
              </h3>

              <span className="label hidden md:block md:text-right">
                {item.stack}
              </span>

              <span
                aria-hidden="true"
                className="label text-right transition-transform duration-700 ease-expo group-hover:translate-x-1"
              >
                {item.year} ↗
              </span>
            </div>

            {/* Expands on hover; always open where there is no hover. */}
            <div className="project-row__reveal md:pl-[3rem]">
              <p className="max-w-[70ch] text-sm leading-relaxed text-muted">
                {item.summary}
              </p>
              <p className="label mt-3 md:hidden">{item.stack}</p>
            </div>

            <span
              aria-hidden="true"
              className="project-row__line absolute inset-x-0 bottom-0 h-px bg-accent"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
