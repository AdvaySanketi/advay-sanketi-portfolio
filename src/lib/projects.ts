import fs from "fs";
import path from "path";
import matter from "gray-matter";

/**
 * Project content lives as MDX in `content/projects/*.mdx`, carried over
 * verbatim from the previous site — same frontmatter shape, so existing
 * project files drop in without edits.
 */

export type TeamMember = {
  name: string;
  role: string;
  avatar: string;
  linkedIn: string;
};

export type ProjectMeta = {
  title: string;
  stack: string;
  publishedAt: string;
  summary: string;
  image?: string;
  images: string[];
  team: TeamMember[];
  github?: string;
};

export type Project = {
  slug: string;
  metadata: ProjectMeta;
  content: string;
};

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");

function readProject(filePath: string): Project {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug: path.basename(filePath, path.extname(filePath)),
    content,
    metadata: {
      title: data.title || "",
      stack: data.stack || "",
      publishedAt: data.publishedAt || "",
      summary: data.summary || "",
      image: data.image || undefined,
      images: Array.isArray(data.images) ? data.images : [],
      team: Array.isArray(data.team) ? data.team : [],
      github: data.github || undefined,
    },
  };
}

/** All projects, newest first. */
export function getProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => path.extname(file) === ".mdx")
    .map((file) => readProject(path.join(PROJECTS_DIR, file)))
    .sort(
      (a, b) =>
        new Date(b.metadata.publishedAt).getTime() -
        new Date(a.metadata.publishedAt).getTime()
    );
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((project) => project.slug === slug);
}

/** Picks specific projects by slug, preserving the order given. */
export function getProjectsBySlug(slugs: string[]): Project[] {
  const all = getProjects();
  return slugs
    .map((slug) => all.find((project) => project.slug === slug))
    .filter((project): project is Project => Boolean(project));
}

/** Every distinct technology across all projects, for the index filter. */
export function getStacks(): string[] {
  const stacks = new Set<string>();
  for (const project of getProjects()) {
    for (const item of project.metadata.stack.split(",")) {
      const trimmed = item.trim();
      if (trimmed) stacks.add(trimmed);
    }
  }
  return Array.from(stacks).sort((a, b) => a.localeCompare(b));
}

export function formatDate(date: string): string {
  if (!date) return "";
  const value = date.includes("T") ? date : `${date}T00:00:00`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatYear(date: string): string {
  if (!date) return "";
  const parsed = new Date(date.includes("T") ? date : `${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "" : String(parsed.getFullYear());
}
