export function slugify(input: string): string {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export type TocEntry = { title: string; slug: string };

/**
 * Pulls the `##` headings out of raw MDX for the article sidebar.
 *
 * Read off the source rather than the rendered output because the page is a
 * server component — there is no DOM to query, and doing it here keeps the
 * table of contents in the initial HTML.
 */
export function getToc(source: string): TocEntry[] {
  const entries: TocEntry[] = [];
  let inFence = false;

  for (const line of source.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      const title = match[1].replace(/[*_`]/g, "").trim();
      entries.push({ title, slug: slugify(title) });
    }
  }

  return entries;
}
