"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, Flex, ToggleButton } from "@/once-ui/components";
import styles from "@/app/components/Header.module.scss";

import { JetBrains_Mono } from "next/font/google";

type TimeDisplayProps = {
  timeZone: string;
  locale?: string;
};

const code = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const TimeDisplay: React.FC<TimeDisplayProps> = ({
  timeZone,
  locale = "en-GB",
}) => {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const timeString = new Intl.DateTimeFormat(locale, options).format(now);
      setCurrentTime(timeString);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, [timeZone, locale]);

  return (
    <span className={code.variable} style={{ fontFamily: "var(--font-mono)" }}>
      {currentTime}
    </span>
  );
};

export default TimeDisplay;

export const Header = () => {
  const pathname = usePathname() ?? "";

  return (
    <Flex
      style={{ height: "fit-content" }}
      className={styles.position}
      as="header"
      zIndex={9}
      fillWidth
      padding="8"
      justifyContent="center"
    >
      <Flex
        hide="s"
        paddingLeft="16"
        fillWidth
        alignItems="center"
        textVariant="body-default-m"
      >
        <Avatar src="/images/avatar3.png" size="l" />
      </Flex>
      <Flex
        background="surface"
        border="neutral-medium"
        borderStyle="solid-1"
        radius="m-4"
        shadow="l"
        padding="4"
        justifyContent="center"
        translate="yes"
      >
        <Flex gap="4" textVariant="body-default-s">
          <ToggleButton prefixIcon="home" href="/" selected={pathname === "/"}>
            <Flex paddingX="2" hide="s">
              Home
            </Flex>
          </ToggleButton>
          <ToggleButton
            prefixIcon="person"
            href="/about"
            selected={pathname === "/about"}
          >
            <Flex paddingX="2" hide="s">
              About
            </Flex>
          </ToggleButton>
          <ToggleButton
            prefixIcon="grid"
            href="/projects"
            selected={pathname.startsWith("/projects")}
          >
            <Flex paddingX="2" hide="s">
              Projects
            </Flex>
          </ToggleButton>
        </Flex>
      </Flex>
      <Flex
        hide="s"
        paddingRight="16"
        fillWidth
        justifyContent="flex-end"
        alignItems="center"
        textVariant="body-default-l"
      >
        <TimeDisplay timeZone="Asia/Kolkata" />
      </Flex>
    </Flex>
  );
};
