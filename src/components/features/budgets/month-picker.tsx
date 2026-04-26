"use client";

import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  month: string; // YYYY-MM-01
  onChange: (month: string) => void;
};

function shiftMonth(monthIso: string, delta: number): string {
  const d = parseISO(monthIso);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 10);
}

function thisMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function MonthPicker({ month, onChange }: Props) {
  const label = format(parseISO(month), "MMMM yyyy", { locale: ro }).replace(
    /^./,
    (c) => c.toUpperCase(),
  );
  const isThisMonth = month === thisMonth();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Luna anterioară"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <span className="min-w-[140px] text-center text-base font-semibold tabular-nums">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Luna următoare"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
      {!isThisMonth ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(thisMonth())}
        >
          Această lună
        </Button>
      ) : null}
    </div>
  );
}
