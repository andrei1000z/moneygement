"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { fromMinor, toMinor } from "@/lib/money";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode" | "lang"
> & {
  /** Suma curentă în unități minore (bani). `null` = empty. */
  value: number | null;
  /** Emite suma în unități minore (integer). null pentru gol. */
  onChange: (minor: number | null) => void;
  /** Codul valutar (RON/EUR/...). Folosit pentru factor + suffix. */
  currency: string;
  /** Permite valori negative? Default true (input-ul nu validează — rolul de a fi semnat aparține caller-ului). */
  allowNegative?: boolean;
  /** Sufix vizual (ex.: "lei", "€"). Default = currency code. */
  suffix?: string;
};

/**
 * Input numeric pentru sume monetare.
 *
 *  - Acceptă "12,34", "12.34", "12 34" (separator: virgulă, punct, spațiu).
 *  - Pe blur formatează la convenția ro-RO ("12,34").
 *  - Emite `onChange` cu valoarea în unități MINORE (1234), ca schema DB.
 *
 * Form-urile pot stoca direct minor units; conversia la "major" pentru
 * display se face intern.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, Props>(
  function CurrencyInput(
    {
      value,
      onChange,
      currency,
      className,
      allowNegative = true,
      suffix,
      ...rest
    },
    ref,
  ) {
    const [focused, setFocused] = React.useState(false);
    const [draft, setDraft] = React.useState<string>(() =>
      formatForDisplay(value, currency),
    );

    // Re-sincronizează draft-ul cu value-ul controlat când nu suntem focusați.
    React.useEffect(() => {
      if (!focused) {
        setDraft(formatForDisplay(value, currency));
      }
    }, [value, currency, focused]);

    function commit(input: string) {
      const parsed = parseRoNumber(input, allowNegative);
      if (parsed === null) {
        onChange(null);
        return;
      }
      const minor = Number(toMinor(parsed, currency));
      onChange(minor);
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          lang="ro-RO"
          autoComplete="off"
          spellCheck={false}
          {...rest}
          value={draft}
          onFocus={(e) => {
            setFocused(true);
            // La focus afișăm forma editabilă (fără spațierea din thousands).
            setDraft(toEditableString(value, currency));
            rest.onFocus?.(e);
          }}
          onChange={(e) => {
            const raw = e.target.value;
            // Acceptă cifre, virgulă, punct, minus, spațiu.
            if (!/^-?[\d., ]*$/.test(raw)) return;
            setDraft(raw);
            commit(raw);
          }}
          onBlur={(e) => {
            setFocused(false);
            commit(draft);
            setDraft(formatForDisplay(value, currency));
            rest.onBlur?.(e);
          }}
          className={cn(
            "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 pr-12 text-base tabular-nums slashed-zero shadow-xs outline-none transition-[color,box-shadow] md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
        <span
          className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
          aria-hidden
        >
          {suffix ?? (currency === "RON" ? "lei" : currency)}
        </span>
      </div>
    );
  },
);

function formatForDisplay(minor: number | null, currency: string): string {
  if (minor === null || !Number.isFinite(minor)) return "";
  const major = fromMinor(minor, currency);
  // Format ro-RO cu separator de mii.
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

function toEditableString(minor: number | null, currency: string): string {
  if (minor === null || !Number.isFinite(minor)) return "";
  const major = fromMinor(minor, currency);
  // Fără thousands separator în modul editabil.
  return major.toFixed(2).replace(".", ",");
}

function parseRoNumber(input: string, allowNegative: boolean): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  // Eliminăm spațiile (separator de mii).
  let cleaned = trimmed.replace(/\s+/g, "");
  // Convertim virgula la punct.
  cleaned = cleaned.replace(",", ".");
  // Permitem un singur '.' (zecimal).
  if ((cleaned.match(/\./g)?.length ?? 0) > 1) {
    // Mai multe puncte => probabil thousands "1.234.56" — păstrăm doar
    // ultimul ca separator zecimal.
    const lastDot = cleaned.lastIndexOf(".");
    cleaned = cleaned.slice(0, lastDot).replace(/\./g, "") + cleaned.slice(lastDot);
  }
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  if (!allowNegative && n < 0) return Math.abs(n);
  return n;
}
