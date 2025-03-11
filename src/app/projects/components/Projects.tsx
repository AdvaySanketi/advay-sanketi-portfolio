import { getPosts } from "@/app/utils";
import { Flex } from "@/once-ui/components";

import { ProjectCard } from "@/app/components";

interface ProjectsProps {
  selectedIndexes?: number[];
}

export function Projects({ selectedIndexes }: ProjectsProps) {
  let allProjects = getPosts(["src", "app", "projects", "project-files"]);

  const sortedProjects = allProjects.sort((a, b) => {
    return (
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
    );
  });

  const displayedProjects = selectedIndexes
    ? selectedIndexes.map((index) => sortedProjects[index - 1])
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
