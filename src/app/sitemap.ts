import type { MetadataRoute } from "next";

import { getProjects } from "@/lib/projects";
import { site } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = getProjects().map((project) => ({
    url: `${site.url}/projects/${project.slug}`,
    lastModified: project.metadata.publishedAt || new Date(),
  }));

  const routes = ["", "/projects", "/about"].map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
  }));

  return [...routes, ...projects];
}
