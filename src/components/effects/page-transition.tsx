"use client";

import { motion } from "motion/react";

import { useReducedMotionPref } from "@/components/effects/use-reduced-motion";

/**
 * PageTransition — fade-in + slide-up 8px pe fiecare montare. Folosit ca
 * wrapper opțional pentru pagini key-by-key.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotionPref();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
