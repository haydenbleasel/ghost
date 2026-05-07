"use client";

import { motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const initial = { opacity: 0, y: 16 };
const animate = { opacity: 1, y: 0 };
const viewport = { margin: "0px 0px -10% 0px", once: true };

export const FadeIn = ({
  delay = 0,
  transition,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) => (
  <motion.div
    initial={initial}
    animate={animate}
    transition={{ delay, duration: 0.6, ease, ...transition }}
    {...props}
  />
);

export const FadeInOnScroll = ({
  delay = 0,
  transition,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) => (
  <motion.div
    initial={initial}
    transition={{ delay, duration: 0.6, ease, ...transition }}
    viewport={viewport}
    whileInView={animate}
    {...props}
  />
);

export const FadeInListItem = ({
  delay = 0,
  transition,
  ...props
}: HTMLMotionProps<"li"> & { delay?: number }) => (
  <motion.li
    initial={initial}
    transition={{ delay, duration: 0.6, ease, ...transition }}
    viewport={viewport}
    whileInView={animate}
    {...props}
  />
);
