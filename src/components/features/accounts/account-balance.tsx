"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

import { cn } from "@/lib/utils";
import { formatMoneyParts, fromMinor } from "@/lib/money";

type Props = {
  amount: bigint | number;
  currency: string;
  className?: string;
  /** Dacă true (default), randează ca un singur block. */
  inline?: boolean;
  /** Dezactivează animația de count-up (util pentru liste lungi). */
  static?: boolean;
};

const PART_KEYS = [
  "sign",
  "integer",
  "separator",
  "decimal",
  "symbol",
] as const;

export function AccountBalance({
  amount,
  currency,
  className,
  inline = true,
  static: isStatic = false,
}: Props) {
  const targetValue = fromMinor(amount, currency);
  const motionValue = useMotionValue(targetValue);
  const spring = useSpring(motionValue, {
    stiffness: 80,
    damping: 18,
    mass: 0.6,
  });

  useEffect(() => {
    if (isStatic) {
      motionValue.jump(targetValue);
    } else {
      motionValue.set(targetValue);
    }
  }, [targetValue, motionValue, isStatic]);

  // Toate valutele V1 (RON/EUR/USD/GBP/CHF/HUF) au exponent 2.
  const sign = useTransform(spring, (l) =>
    formatMoneyParts(Math.round(l * 100), currency).sign,
  );
  const integer = useTransform(spring, (l) =>
    formatMoneyParts(Math.round(l * 100), currency).integer,
  );
  const separator = useTransform(spring, (l) =>
    formatMoneyParts(Math.round(l * 100), currency).separator,
  );
  const decimal = useTransform(spring, (l) =>
    formatMoneyParts(Math.round(l * 100), currency).decimal,
  );
  const symbol = useTransform(spring, (l) =>
    formatMoneyParts(Math.round(l * 100), currency).symbol,
  );
  void PART_KEYS;

  const negative = targetValue < 0;
  const staticParts = formatMoneyParts(amount, currency);
  const ariaLabel = `${
    staticParts.sign === "−" ? "minus " : ""
  }${staticParts.integer}${staticParts.separator}${staticParts.decimal} ${
    staticParts.symbol
  }`;

  const Wrapper = inline ? motion.span : motion.div;

  return (
    <Wrapper
      className={cn(
        "inline-flex items-baseline gap-[0.18em] tabular-nums slashed-zero font-semibold",
        negative ? "text-destructive" : "text-foreground",
        className,
      )}
      aria-label={ariaLabel}
    >
      <motion.span aria-hidden>{sign}</motion.span>
      <motion.span aria-hidden>{integer}</motion.span>
      <motion.span aria-hidden>{separator}</motion.span>
      <motion.span
        aria-hidden
        className="text-[0.8em] font-medium opacity-80"
      >
        {decimal}
      </motion.span>
      <motion.span
        aria-hidden
        className="text-muted-foreground ml-1 text-[0.85em] font-medium"
      >
        {symbol}
      </motion.span>
    </Wrapper>
  );
}
