import {
  Avatar,
  Button,
  Flex,
  Heading,
  Icon,
  IconButton,
  SmartImage,
  Tag,
  Text,
} from "@/once-ui/components";
import TableOfContents from "@/app/about/components/TableOfContents";
import styles from "@/app/about/about.module.scss";

const social = [
  {
    name: "GitHub",
    icon: "github",
    link: "https://github.com/AdvaySanketi",
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    link: "https://www.linkedin.com/in/advaysanketi/",
  },
  {
    name: "Hackerrank",
    icon: "hackerrank",
    link: "https://www.hackerrank.com/advay2807",
  },
  {
    name: "Email",
    icon: "email",
    link: "mailto:advay2807@gmail.com",
  },
];

const about = {
  work: {
    title: "Work Experience",
    experiences: [
      {
        company: "Twospoon.ai",
        timeframe: "Apr 2024 - Present",
        role: "Software Development Intern",
        achievements: [
          <>
            Spearheaded the development of full-stack applications, honing
            expertise across both front-end and back-end technologies.
          </>,
          <>
            Contributed to software development efforts by resolving bugs,
            writing unit tests, and ensuring high-quality, well-documented code.
          </>,
        ],
        images: [
          {
            src: "/images/work/twospoon_website.png",
            alt: "Twospoon.ai",
            width: 16,
            height: 9,
          },
          {
            src: "/images/work/social_dashboard.png",
            alt: "Twospoon.ai",
            width: 16,
            height: 9,
          },
          {
            src: "/images/work/kerosene_website.png",
            alt: "Twospoon.ai",
            width: 16,
            height: 9,
          },
          {
            src: "/images/work/kerosene_app.png",
            alt: "Twospoon.ai",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        company: "College Clubs",
        timeframe: "2023 - Present",
        role: "Domain Head",
        achievements: [
          <>
            <h3>Technical and Projects Head</h3>
            <Text
              variant="heading-default-m"
              onBackground="brand-weak"
              marginBottom="m"
            >
              Equinox ECC
            </Text>
            <p>
              <Text variant="heading-default-xs" onBackground="neutral-weak">
                May 2024 - Present
              </Text>
            </p>
            <br />
            <ul>
              <li>
                Spearheaded the development of innovative tech projects for
                Equinox ECC, enhancing the organization's digital presence and
                project management.
              </li>
              <li>
                Led cross-functional teams in delivering large-scale engineering
                solutions, improving project execution efficiency by 30%.
              </li>
              <li>
                Integrated modern technologies to automate processes, reducing
                manual work by 25% and increasing team productivity.
              </li>
            </ul>
          </>,
          <>
            <h3>IT Head</h3>
            <Text
              variant="heading-default-m"
              onBackground="brand-weak"
              marginBottom="m"
            >
              Kannada Koota PESU
            </Text>
            <p>
              <Text variant="heading-default-xs" onBackground="neutral-weak">
                Aug 2023 - Present
              </Text>
            </p>
            <br />
            <ul>
              <li>
                Developed and launched the official Kannada Koota PESU website,
                providing a digital platform to showcase events and activities,
                enhancing community engagement.
              </li>
              <li>
                Established a design system to unify branding across web and
                social platforms, improving design consistency by 40%.
              </li>
              <li>
                Implemented new IT workflows that streamlined operations,
                resulting in a 20% reduction in manual tasks.
              </li>
            </ul>
          </>,
          <>
            <h3>Competitive Programming Head</h3>
            <Text
              variant="heading-default-m"
              onBackground="brand-weak"
              marginBottom="m"
            >
              Codechef PESU
            </Text>
            <p>
              <Text variant="heading-default-xs" onBackground="neutral-weak">
                Aug 2023 - Present
              </Text>
            </p>
            <br />
            <ul>
              <li>
                Organized and managed coding competitions and hackathons that
                saw a 25% increase in participation.
              </li>
              <li>
                Collaborated with peers to introduce new problem-solving
                sessions, enhancing problem-solving skills across the club.
              </li>
            </ul>
          </>,
        ],
        images: [
          {
            src: "/images/work/kk_website.png",
            alt: "Kannada Koota Website",
            width: 16,
            height: 9,
          },
          {
            src: "/images/work/kk_website_2.png",
            alt: "Kannada Koota Website",
            width: 16,
            height: 9,
          },
        ],
      },

      {
        company: "WellBeing.Sanketis",
        timeframe: "Dec 2020 - Present",
        role: "Self-Employed Youtuber",
        achievements: [
          <>
            Managing and producing content and Video Descriptions for
            WellBeing.Sanketis, a channel focused on Fitness, Health Tips,
            Traditional and Nutritional Recipes, Yoga Videos etc.
          </>,
          <>
            Achieved 1.3k+ Subscribers, 5,00,000+ views and 10000+ Watch Hours
          </>,
          <>Over 600 published Videos and Shorts</>,
        ],
        images: [
          {
            src: "/images/work/youtube.png",
            alt: "WellBeing.Sanketis",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
  education: {
    title: "Education",
    institutions: [
      {
        name: "PES University",
        label: "PES University",
        description: (
          <>
            <p>Bachelor of Technology - BTech, Computer Science</p>
            <p>2022 - 2026</p>
            <p>CGPA: 9.15</p>
          </>
        ),
      },
      {
        name: "Kendriya Vidyalaya",
        label: "Kendriya Vidyalaya",
        description: (
          <>
            <p>11th and 12th Computer Science</p>
            <p>2020 - 2022</p>
            <p>Grade: 94% (CBSE)</p>
          </>
        ),
      },
      {
        name: "Air Force Golden Jubilee Institute",
        label: "AFGJI",
        description: (
          <>
            <p>10th</p>
            <p>2019 - 2020</p>
            <p>Grade: 96% (CBSE)</p>
          </>
        ),
      },
    ],
  },
  technical: {
    title: "Technical Skills",
    skills: [
      {
        title: "Programming Languages",
        description: (
          <>
            Proficient in Python, C, C++, JavaScript, and Dart for a variety of
            use cases including full-stack development, data analysis, and AI/ML
            projects.
          </>
        ),
        images: [],
      },
      {
        title: "Flutter & Dart",
        description: (
          <>
            Developing cross-platform mobile and web applications using Flutter
            and Dart.
          </>
        ),
        images: [],
      },
      {
        title: "React.js & Next.js",
        description: (
          <>
            Building performant web apps using React.js, Next.js, and
            Tailwind.CSS CSS.
          </>
        ),
        images: [],
      },

      {
        title: "Backend Development",
        description: (
          <>
            Experienced with Flask, Django, FastAPI, and Node.js for backend
            development, integrated with SQL and MongoDB databases and Firebase
            for Storage and Authentication.
          </>
        ),
        images: [],
      },
      {
        title: "Cloud & Deployment",
        description: (
          <>Deploying applications using Docker, AWS, Vercel, and Render.</>
        ),
        images: [],
      },
      {
        title: "UI/UX Design",
        description: (
          <>Proficient in Figma and Canva for rapid prototyping and design.</>
        ),
        images: [],
      },
      {
        title: "Version Control",
        description: (
          <>
            Experienced in using Git and GitHub for collaborative development,
            version tracking, and managing code repositories efficiently.
          </>
        ),
        images: [],
      },
      {
        title: "Testing & QA",
        description: (
          <>
            Proficient in using Selenium for web testing and Sentry for error
            tracking, ensuring high code quality and reliability.
          </>
        ),
        images: [],
      },
    ],
  },
};

export function generateMetadata() {
  const title = "Advay Sanketi - That's Me";
  const description = "Hi I'm Advay Sanketi, a Full-Stack Developer";
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
      url: `https://advay-sanketi-portfolio.vercel.app/blog`,
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

const structure = [
  {
    title: "Introduction",
    items: [],
  },
  {
    title: about.work.title,
    items: about.work.experiences.map((experience) => experience.company),
  },
  {
    title: about.education.title,
    items: about.education.institutions.map((institution) => institution.label),
  },
  {
    title: about.technical.title,
    items: about.technical.skills.map((skill) => skill.title),
  },
];

export default function About() {
  return (
    <Flex fillWidth maxWidth="m" direction="column">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Advay Sanketi",
            jobTitle: "Full Stack Development",
            description:
              "Hello, I am Advay Sanketi, Developer at heart, with a passion for technology and a curiosity without bounds. I'm skilled at finding creative and innovative solutions to complex problems, and I'm good at working effectively with cross-functional teams. I'm also an excellent communicator and a good mentor. I can accept constructive criticism and work on it to improve myself. I like to stay up-to-date with all the latest technologies and am highly reliable.",
            url: `https://advay-sanketi-portfolio.vercel.app/about`,
            image: `advay-sanketi-portfolio.vercel.app/images/avatar.jpg`,
            sameAs: social
              .filter((item) => item.link && !item.link.startsWith("mailto:")) // Filter out empty links and email links
              .map((item) => item.link),
            worksFor: {
              "@type": "Organization",
              name: about.work.experiences[0].company || "",
            },
          }),
        }}
      />
      <Flex
        style={{ left: "0", top: "50%", transform: "translateY(-50%)" }}
        position="fixed"
        paddingLeft="24"
        gap="32"
        direction="column"
        hide="s"
      >
        <TableOfContents structure={structure} />
      </Flex>
      <Flex fillWidth mobileDirection="column" justifyContent="center">
        <Flex
          minWidth="160"
          paddingX="l"
          paddingBottom="xl"
          gap="m"
          flex={3}
          direction="column"
          alignItems="center"
        >
          <Avatar src="/images/avatar.jpg" size="xl" />
          <Flex gap="8" alignItems="center">
            <Icon onBackground="accent-weak" name="globe" />
            Karnataka, India
          </Flex>

          <Flex wrap gap="8" paddingLeft="16">
            {["English", "Hindi", "Kannada"].map((language) => (
              <Tag size="l">{language}</Tag>
            ))}
          </Flex>
        </Flex>
        <Flex
          className={styles.blockAlign}
          fillWidth
          flex={9}
          maxWidth={40}
          direction="column"
        >
          <Flex
            id={"Introduction"}
            fillWidth
            minHeight="160"
            direction="column"
            justifyContent="center"
            marginBottom="32"
          >
            <Heading className={styles.textAlign} variant="display-strong-xl">
              Advay Sanketi
            </Heading>
            <Text
              className={styles.textAlign}
              variant="display-default-xs"
              onBackground="neutral-weak"
            >
              Full-Stack Developer
            </Text>
            {social.length > 0 && (
              <Flex
                className={styles.blockAlign}
                paddingTop="20"
                paddingBottom="8"
                gap="8"
                wrap
              >
                {social.map(
                  (item) =>
                    item.link && (
                      <Button
                        key={item.name}
                        href={item.link}
                        prefixIcon={item.icon}
                        label={item.name}
                        size="s"
                        variant="tertiary"
                      />
                    )
                )}
              </Flex>
            )}
          </Flex>

          <Flex
            direction="column"
            textVariant="body-default-l"
            fillWidth
            gap="m"
            marginBottom="xl"
          >
            <p>
              Hello, My name is Advay Sanketi and I am currently pursuing my
              BTech in Computer Science at PES University in Bengaluru.
            </p>
            <p>
              Born into a South Indian Air Force Family, I grew up to love 3
              things - food for my body, food for thought, and coding.
            </p>
            <p>
              For me code is more than just a set of instructions - it's a
              powerful tool that enables us not only to explore amazing
              opportunities but also to create new possibilities allowing for a
              future with a higher promise - A vision worthy of working towards.
              I started programming when I was 13 - 14 years old. I have grown a
              lot since then and my coding arsenal now includes many programming
              languages, softwares and frameworks. I'm always expanding my
              skills, and I'm excited to see where my coding journey will take
              me next 😆.
            </p>
            <p>
              I also enjoy listening to music, watching anime, Staying fit &
              healthy and reading about really interesting stuff like -
              Lumination Encoding, Evolutionary Algorithms, the Dreamer
              Algorithm, Conway's Game of Life (Check these topics out, they're
              amazing 😋)
            </p>
          </Flex>

          <>
            <Heading
              as="h2"
              id={about.work.title}
              variant="display-strong-s"
              marginBottom="m"
            >
              {about.work.title}
            </Heading>
            <Flex direction="column" fillWidth gap="l" marginBottom="40">
              {about.work.experiences.map((experience, index) => (
                <Flex
                  key={`${experience.company}-${experience.role}-${index}`}
                  fillWidth
                  direction="column"
                >
                  <Flex
                    fillWidth
                    justifyContent="space-between"
                    alignItems="flex-end"
                    marginBottom="4"
                  >
                    <Text id={experience.company} variant="heading-strong-l">
                      {experience.role}
                    </Text>
                    <Text
                      variant="heading-default-xs"
                      onBackground="neutral-weak"
                    >
                      {experience.timeframe}
                    </Text>
                  </Flex>
                  <Text
                    variant="body-default-s"
                    onBackground="brand-weak"
                    marginBottom="m"
                  >
                    {experience.company}
                  </Text>
                  <Flex as="ul" direction="column" gap="16">
                    {experience.achievements.map((achievement, index) => (
                      <Text
                        as="li"
                        variant="body-default-m"
                        key={`${experience.company}-${index}`}
                      >
                        {achievement}
                      </Text>
                    ))}
                  </Flex>
                  {experience.images.length > 0 && (
                    <Flex
                      fillWidth
                      paddingTop="m"
                      paddingLeft="40"
                      wrap
                      gap="xs"
                    >
                      {experience.images.map((image, index) => (
                        <Flex
                          key={index}
                          border="neutral-medium"
                          borderStyle="solid-1"
                          radius="m"
                          minWidth={image.width}
                          height={image.height}
                        >
                          <SmartImage
                            enlarge
                            radius="m"
                            sizes={image.width.toString()}
                            alt={image.alt}
                            src={image.src}
                          />
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Flex>
              ))}
            </Flex>
          </>

          <>
            <Heading
              as="h2"
              id={about.education.title}
              variant="display-strong-s"
              marginBottom="m"
            >
              {about.education.title}
            </Heading>
            <Flex direction="column" fillWidth gap="l" marginBottom="40">
              {about.education.institutions.map((institution, index) => (
                <Flex
                  key={`${institution.name}-${index}`}
                  fillWidth
                  gap="4"
                  direction="column"
                >
                  <Text id={institution.label} variant="heading-strong-l">
                    {institution.name}
                  </Text>
                  <Text
                    variant="heading-default-xs"
                    onBackground="neutral-weak"
                  >
                    {institution.description}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </>

          <>
            <Heading
              as="h2"
              id={about.technical.title}
              variant="display-strong-s"
              marginBottom="40"
            >
              {about.technical.title}
            </Heading>
            <Flex direction="column" fillWidth gap="l">
              {about.technical.skills.map((skill, index) => (
                <Flex
                  key={`${skill}-${index}`}
                  fillWidth
                  gap="4"
                  direction="column"
                >
                  <Text id={skill.title} variant="heading-strong-l">
                    {skill.title}
                  </Text>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    {skill.description}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </>
        </Flex>
      </Flex>
    </Flex>
  );
}
