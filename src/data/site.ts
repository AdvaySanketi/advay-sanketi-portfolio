export const site = {
  name: "Advay Sanketi",
  role: "Full-Stack Developer",
  tagline: "Working towards a future with a higher promise",
  location: "Karnataka, India",
  languages: ["English", "Hindi", "Kannada"],
  avatar: "/images/avatar.jpg",
  email: "advay2807@gmail.com",
  url: "https://advay-sanketi-portfolio.vercel.app",
  description:
    "Portfolio of Advay Sanketi — full-stack developer building AI systems, developer tools and cross-platform apps.",
  intro: [
    "Hello, My name is Advay Sanketi and I am currently pursuing my BTech in Computer Science at PES University in Bengaluru.",
    "Born into a South Indian Air Force Family, I grew up to love 3 things — food for my body, food for thought, and coding.",
    "For me code is more than just a set of instructions — it's a powerful tool that enables us not only to explore amazing opportunities but also to create new possibilities allowing for a future with a higher promise. A vision worthy of working towards.",
    "I also enjoy listening to music, watching anime, staying fit & healthy and reading about really interesting stuff like Lumination Encoding, Evolutionary Algorithms, the Dreamer Algorithm and Conway's Game of Life.",
  ],
  featuredProjects: ["kerosene", "meta-ads-project", "mixtape"],
  currently: [
    "building AI systems",
    "shipping developer tools",
    "reading about the Dreamer algorithm",
    "listening to something on loop",
    "watching anime between builds",
    "training body & mind",
  ],
} as const;

export type Social = {
  name: string;
  handle: string;
  link: string;
};

export const socials: Social[] = [
  {
    name: "GitHub",
    handle: "@AdvaySanketi",
    link: "https://github.com/AdvaySanketi",
  },
  {
    name: "LinkedIn",
    handle: "advaysanketi",
    link: "https://www.linkedin.com/in/advaysanketi/",
  },
  {
    name: "Advay, Abstracted",
    handle: "@advay-sanketi",
    link: "https://advay-writes.hashnode.dev/",
  },
  {
    name: "Email",
    handle: "advay2807@gmail.com",
    link: "mailto:advay2807@gmail.com",
  },
];

export type WorkImage = {
  src: string;
  alt: string;
};

export type SubRole = {
  title: string;
  org: string;
  timeframe: string;
  points: string[];
};

export type Experience = {
  company: string;
  role: string;
  timeframe: string;
  achievements: string[];
  roles?: SubRole[];
  images: WorkImage[];
};

export const experiences: Experience[] = [
  {
    company: "Custiv AI Labs",
    role: "Software Development Intern",
    timeframe: "Jun 2025 — May 2026",
    achievements: [
      "Built an end-to-end AI system to streamline manufacturing quality and compliance workflows.",
      "Designed and shipped an auditing platform that cut facility audit time from multiple days down to a few hours.",
      "Worked across the stack to integrate AI-driven checks into existing manufacturing processes with minimal disruption to floor operations.",
    ],
    images: [],
  },
  {
    company: "Twospoon.ai",
    role: "Software Development Intern",
    timeframe: "Apr 2024 — Jun 2025",
    achievements: [
      "Spearheaded the development of full-stack applications, honing expertise across both front-end and back-end technologies.",
      "Contributed to software development efforts by resolving bugs, writing unit tests, and ensuring high-quality, well-documented code.",
    ],
    images: [],
  },
  {
    company: "College Clubs",
    role: "Domain Head",
    timeframe: "2023 — 2025",
    achievements: [],
    roles: [
      {
        title: "Technical and Projects Head",
        org: "Equinox ECC",
        timeframe: "May 2024 — Dec 2025",
        points: [
          "Spearheaded the development of innovative tech projects for Equinox ECC, enhancing the organization's digital presence and project management.",
          "Led cross-functional teams in delivering large-scale engineering solutions, improving project execution efficiency by 30%.",
          "Integrated modern technologies to automate processes, reducing manual work by 25% and increasing team productivity.",
        ],
      },
      {
        title: "IT Head",
        org: "Kannada Koota PESU",
        timeframe: "Aug 2023 — Dec 2025",
        points: [
          "Developed and launched the official Kannada Koota PESU website, providing a digital platform to showcase events and activities, enhancing community engagement.",
          "Established a design system to unify branding across web and social platforms, improving design consistency by 40%.",
          "Implemented new IT workflows that streamlined operations, resulting in a 20% reduction in manual tasks.",
        ],
      },
      {
        title: "Competitive Programming Head",
        org: "Codechef PESU",
        timeframe: "Aug 2023 — Dec 2025",
        points: [
          "Organized and managed coding competitions and hackathons that saw a 25% increase in participation.",
          "Collaborated with peers to introduce new problem-solving sessions, enhancing problem-solving skills across the club.",
        ],
      },
    ],
    images: [
      { src: "/images/work/kk_website.png", alt: "Kannada Koota website" },
      { src: "/images/work/kk_website_2.png", alt: "Kannada Koota website" },
    ],
  },
  {
    company: "WellBeing.Sanketis",
    role: "Self-Employed Youtuber",
    timeframe: "Dec 2020 — Present",
    achievements: [
      "Managing and producing content and video descriptions for WellBeing.Sanketis, a channel focused on fitness, health tips, traditional and nutritional recipes, and yoga.",
      "Achieved 1.3k+ subscribers, 500,000+ views and 10,000+ watch hours.",
      "Over 600 published videos and shorts.",
    ],
    images: [{ src: "/images/work/youtube.png", alt: "WellBeing.Sanketis" }],
  },
];

export type Institution = {
  name: string;
  label: string;
  qualification: string;
  timeframe: string;
  result: string;
};

export const education: Institution[] = [
  {
    name: "PES University",
    label: "PES University",
    qualification: "Bachelor of Technology — BTech, Computer Science",
    timeframe: "2022 — 2026",
    result: "CGPA: 9.15",
  },
  {
    name: "Kendriya Vidyalaya",
    label: "Kendriya Vidyalaya",
    qualification: "11th and 12th, Computer Science",
    timeframe: "2020 — 2022",
    result: "94% (CBSE)",
  },
  {
    name: "Air Force Golden Jubilee Institute",
    label: "AFGJI",
    qualification: "10th",
    timeframe: "2019 — 2020",
    result: "96% (CBSE)",
  },
];

export type Skill = {
  title: string;
  description: string;
  tags: string[];
};

export const skills: Skill[] = [
  {
    title: "Programming Languages",
    description:
      "Proficient in Python, C, C++, JavaScript and Dart for a variety of use cases including full-stack development, data analysis, and AI/ML projects.",
    tags: ["Python", "C", "C++", "JavaScript", "TypeScript", "Dart"],
  },
  {
    title: "Flutter & Dart",
    description:
      "Developing cross-platform mobile and web applications using Flutter and Dart.",
    tags: ["Flutter", "Dart"],
  },
  {
    title: "React.js & Next.js",
    description:
      "Building performant web apps using React.js, Next.js and Tailwind CSS.",
    tags: ["React", "Next.js", "Tailwind CSS"],
  },
  {
    title: "Backend Development",
    description:
      "Experienced with Flask, Django, FastAPI and Node.js for backend development, integrated with SQL and MongoDB databases, and Firebase for storage and authentication.",
    tags: ["Node.js", "FastAPI", "Django", "Flask", "MongoDB", "Firebase"],
  },
  {
    title: "Cloud & Deployment",
    description: "Deploying applications using Docker, AWS, Vercel and Render.",
    tags: ["Docker", "AWS", "Vercel", "Render"],
  },
  {
    title: "UI/UX Design",
    description: "Proficient in Figma and Canva for rapid prototyping and design.",
    tags: ["Figma", "Canva"],
  },
  {
    title: "Version Control",
    description:
      "Experienced in using Git and GitHub for collaborative development, version tracking, and managing code repositories efficiently.",
    tags: ["Git", "GitHub"],
  },
  {
    title: "Testing & QA",
    description:
      "Proficient in using Selenium for web testing and Sentry for error tracking, ensuring high code quality and reliability.",
    tags: ["Selenium", "Sentry"],
  },
];

export type NavItem = { label: string; href: string; index: string };

export const nav: NavItem[] = [
  { label: "Index", href: "/", index: "01" },
  { label: "Work", href: "/projects", index: "02" },
  { label: "About", href: "/about", index: "03" },
];
