"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO, subDays } from "date-fns";
import { ro } from "date-fns/locale";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DailySpend } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

const Heatmap = dynamic(
  () => import("react-calendar-heatmap").then((m) => m.default),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

type Props = {
  daily: DailySpend[];
  currency: string;
  /** Mobile: 84 zile, desktop: 365. Se selectează prin clasa Tailwind. */
  days?: number;
};

export function SpendingHeatmap({ daily, currency, days = 84 }: Props) {
  const today = new Date();
  const start = subDays(today, days - 1);
  const [selectedDay, setSelectedDay] = useState<DailySpend | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, DailySpend>();
    for (const d of daily) m.set(d.date, d);
    return m;
  }, [daily]);

  const max = useMemo(() => {
    let m = 0;
    for (const d of daily) if (d.amount > m) m = d.amount;
    return m;
  }, [daily]);

  function intensity(amount: number): number {
    if (max === 0) return 0;
    return Math.min(4, Math.ceil((amount / max) * 4));
  }

  const values = daily.map((d) => ({
    date: d.date,
    count: d.amount,
  }));

  return (
    <>
      <div className="border-border/60 bg-card rounded-xl border p-3">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-muted-foreground text-xs uppercase tracking-wider">
            Cheltuieli zilnice
          </h3>
          <p className="text-muted-foreground text-[10px]">
            ultimele {days} zile
          </p>
        </div>
        <div className="banii-heatmap">
          <Heatmap
            startDate={start}
            endDate={today}
            values={values}
            classForValue={(value) => {
              const v = value as unknown as
                | { date?: string; count?: number }
                | null
                | undefined;
              if (!v || !v.count) return "color-empty";
              return `color-scale-${intensity(v.count)}`;
            }}
            titleForValue={(value) => {
              const v = value as unknown as
                | { date?: string; count?: number }
                | null
                | undefined;
              if (!v?.date) return "";
              const day = byDate.get(v.date);
              return day
                ? `${v.date}: ${formatMoney(day.amount, currency)} (${day.count} tranzacții)`
                : v.date;
            }}
            onClick={(value) => {
              const v = value as unknown as
                | { date?: string }
                | null
                | undefined;
              if (!v?.date) return;
              const day = byDate.get(v.date);
              if (day) setSelectedDay(day);
            }}
          />
        </div>
        <p className="text-muted-foreground mt-2 px-1 text-[10px]">
          Atinge o zi pentru detalii.
        </p>
      </div>

      <Drawer
        open={!!selectedDay}
        onOpenChange={(v) => !v && setSelectedDay(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selectedDay
                ? format(parseISO(selectedDay.date), "EEEE, d MMM yyyy", {
                    locale: ro,
                  }).replace(/^./, (c) => c.toUpperCase())
                : ""}
            </DrawerTitle>
            <DrawerDescription>
              {selectedDay
                ? `Total: ${formatMoney(
                    selectedDay.amount,
                    currency,
                  )} · ${selectedDay.count} tranzacții`
                : ""}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <a
              href={`/transactions?from=${selectedDay?.date}&to=${selectedDay?.date}`}
              className={cn(
                "border-border/60 bg-card hover:bg-accent/40 flex items-center justify-between rounded-lg border p-3 text-sm",
              )}
            >
              <span>Vezi tranzacțiile zilei</span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
