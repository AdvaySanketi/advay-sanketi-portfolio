import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import type { ReactNode } from "react";

import { slugify } from "@/lib/toc";

function headingText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(headingText).join("");
  if (typeof children === "number") return String(children);
  return "";
}

function createHeading(level: 2 | 3 | 4) {
  const Tag = `h${level}` as "h2" | "h3" | "h4";

  function Heading({ children }: { children?: ReactNode }) {
    const slug = slugify(headingText(children));
    return (
      <Tag id={slug} className="group scroll-mt-28">
        <a href={`#${slug}`} className="no-underline">
          {children}
          <span
            aria-hidden="true"
            className="ml-3 align-middle text-sm text-faint opacity-0 transition-opacity group-hover:opacity-100"
          >
            #
          </span>
        </a>
      </Tag>
    );
  }

  Heading.displayName = `MdxHeading${level}`;
  return Heading;
}

function MdxLink({ href = "", children, ...props }: { href?: string; children?: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function MdxImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    <figure className="my-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
      {alt ? (
        <figcaption className="label mt-3 text-center">{alt}</figcaption>
      ) : null}
    </figure>
  );
}

function Table({ data }: { data: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            {data.headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const components = {
  h1: createHeading(2),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  a: MdxLink,
  img: MdxImage,
  Table,
} as const;

export function Mdx({ source }: { source: string }) {
  return (
    <div className="prose-mdx">
      <MDXRemote source={source} components={components as never} />
    </div>
  );
}
