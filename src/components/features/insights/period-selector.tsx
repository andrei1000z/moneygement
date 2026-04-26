"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export type Period = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

const OPTIONS: { value: Period; label: string }[] = [
  { value: "1M", label: "1L" },
  { value: "3M", label: "3L" },
  { value: "6M", label: "6L" },
  { value: "YTD", label: "YTD" },
  { value: "1Y", label: "1A" },
  { value: "ALL", label: "Tot" },
];

export function PeriodSelector({ current = "6M" as Period }: { current?: Period }) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(p: Period) {
    const params = new URLSearchParams(sp);
    params.set("period", p);
    router.replace(`/insights?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="bg-muted inline-flex rounded-md p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => set(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition",
            current === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function periodToMonths(p: Period): number {
  switch (p) {
    case "1M":
      return 1;
    case "3M":
      return 3;
    case "6M":
      return 6;
    case "YTD": {
      const now = new Date();
      return now.getMonth() + 1;
    }
    case "1Y":
      return 12;
    case "ALL":
      return 60;
  }
}
