import { getPosts } from "@/app/utils";
import { Flex } from "@/once-ui/components";

import { ProjectCard } from "@/app/components";

interface ProjectsProps {
  selectedIndexes?: number[];
  selectedSlugs?: string[];
}

export function Projects({ selectedIndexes, selectedSlugs }: ProjectsProps) {
  let allProjects = getPosts(["src", "app", "projects", "project-files"]);

  const sortedProjects = allProjects.sort((a, b) => {
    return (
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
    );
  });

  // Prefer selecting by slug (stable) over index (fragile when dates tie).
  const displayedProjects = selectedSlugs
    ? selectedSlugs
        .map((slug) => sortedProjects.find((project) => project.slug === slug))
        .filter((project): project is (typeof sortedProjects)[number] =>
          Boolean(project)
        )
    : selectedIndexes
    ? selectedIndexes
        .map((index) => sortedProjects[index - 1])
        .filter((project): project is (typeof sortedProjects)[number] =>
          Boolean(project)
        )
    : sortedProjects;

  return (
    <Flex fillWidth gap="l" marginBottom="40" paddingX="l" direction="column">
      {displayedProjects.map((post) => (
        <ProjectCard
          key={post.slug}
          href={`/projects/${post.slug}`}
          images={post.metadata.images}
          title={post.metadata.title}
          stack={post.metadata.stack}
          description={post.metadata.summary}
          content={post.content}
          avatars={
            post.metadata.team?.map((member) => ({ src: member.avatar })) || []
          }
          github={post.metadata.github}
        />
      ))}
    </Flex>
  );
}
