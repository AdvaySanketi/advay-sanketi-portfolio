import { Flex, IconButton, SmartLink, Text } from "@/once-ui/components";

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

export const Footer = () => {
  return (
    <Flex
      as="footer"
      position="relative"
      fillWidth
      padding="8"
      justifyContent="center"
    >
      <Flex
        fillWidth
        maxWidth="m"
        paddingY="8"
        paddingX="16"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-default-s" onBackground="neutral-strong">
          <Text onBackground="neutral-weak">© 2025 /</Text>
          <Text paddingX="4">Advay Sanketi</Text>
          <Text onBackground="neutral-weak">
            / Building the future, one line of code at a time.
          </Text>
        </Text>
        <Flex gap="16">
          {social.map(
            (item) =>
              item.link && (
                <IconButton
                  key={item.name}
                  href={item.link}
                  icon={item.icon}
                  tooltip={item.name}
                  size="s"
                  variant="ghost"
                />
              )
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
