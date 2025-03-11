import { getPosts } from "@/app/utils";
import { Flex } from "@/once-ui/components";
import { Projects } from "@/app/projects/components/Projects";

export function generateMetadata() {
  const title = "Advay Sanketi - That's Me";
  const description = "Projects by Advay Sanketi";
  const ogImage = `https://advay-sanketi-portfolio.vercel.app/og?title=${encodeURIComponent(
    title
  )}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://advay-sanketi-portfolio.vercel.app/projects`,
      images: [
        {
          url: ogImage,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function Work() {
  let allProjects = getPosts(["src", "app", "projects", "project-files"]);

  return (
    <Flex fillWidth maxWidth="m" direction="column">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            headline: "My projects",
            description: "Projects by Advay Sanketi",
            url: `https://advay-sanketi-portfolio.vercel.app/projects`,
            image: `advay-sanketi-portfolio.vercel.app/og?title=My%20Projects`,
            author: {
              "@type": "Person",
              name: "Advay Sanketi",
            },
            hasPart: allProjects.map((project) => ({
              "@type": "CreativeWork",
              headline: project.metadata.title,
              description: project.metadata.summary,
              url: `https://advay-sanketi-portfolio.vercel.app/projects/${project.slug}`,
              image: `advay-sanketi-portfolio.vercel.app/${project.metadata.image}`,
            })),
          }),
        }}
      />
      <Projects selectedIndexes={[6, 3, 4, 5, 1, 9, 2, 7, 8]} />
    </Flex>
  );
}
