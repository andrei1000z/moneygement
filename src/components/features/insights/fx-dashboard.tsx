"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TRACKED_CURRENCIES, formatRate } from "@/lib/fx";
import { cn } from "@/lib/utils";

type Point = { date: string; rate: number; source: string };

type Props = {
  base: (typeof TRACKED_CURRENCIES)[number];
  yearSeries: Point[];
  recent: Point[];
};

export function FxDashboard({ base, yearSeries, recent }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function setPair(next: string) {
    const usp = new URLSearchParams(params.toString());
    usp.set("pair", next);
    start(() => router.push(`/insights/fx?${usp.toString()}`));
  }

  const last = yearSeries.at(-1);
  const first = yearSeries[0];
  const yoyDelta = last && first ? ((last.rate - first.rate) / first.rate) * 100 : 0;

  const chartData = yearSeries.map((p) => ({
    label: format(parseISO(p.date), "MMM yy", { locale: ro }),
    rate: p.rate,
    raw: p.date,
  }));

  return (
    <div className="space-y-4">
      {/* Selector pereche */}
      <div className="flex flex-wrap gap-2">
        {TRACKED_CURRENCIES.map((c) => {
          const active = c === base;
          return (
            <Button
              key={c}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setPair(c)}
              disabled={pending && active}
              className={cn(
                "h-8 px-3 text-xs",
                pending && !active && "opacity-50",
              )}
            >
              {c} → RON
            </Button>
          );
        })}
      </div>

      {/* Hero number */}
      <div className="glass-thin rounded-[--radius-card] p-5">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Curs azi
        </p>
        {last ? (
          <div className="mt-1 flex items-baseline gap-3">
            <p className="text-3xl font-semibold tabular-nums">
              {formatRate(last.rate)}
            </p>
            <p className="text-muted-foreground text-sm">
              lei pentru 1 {base} ·{" "}
              {format(parseISO(last.date), "d MMM yyyy", { locale: ro })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nicio rată în ultimul an. Rulează pipeline-ul FX prima dată.
          </p>
        )}
        {last && first ? (
          <p
            className={cn(
              "mt-2 text-sm tabular-nums",
              yoyDelta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500",
            )}
          >
            {yoyDelta >= 0 ? "▲" : "▼"} {Math.abs(yoyDelta).toFixed(2)}% YoY
          </p>
        ) : null}
      </div>

      {/* Chart 1Y */}
      <div className="glass-thin rounded-[--radius-card] p-4">
        <h3 className="text-muted-foreground mb-3 text-xs uppercase tracking-wider">
          Evoluție 12 luni
        </h3>
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  minTickGap={32}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    typeof v === "number" ? formatRate(v, 2) : ""
                  }
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value) => {
                    if (value == null) return "";
                    const n =
                      typeof value === "number" ? value : Number(value);
                    return Number.isFinite(n) ? formatRate(n) : "";
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#fxGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Skeleton className="h-72 w-full rounded-xl" />
        )}
      </div>

      {/* Tabel 30 zile */}
      <div className="glass-thin rounded-[--radius-card]">
        <h3 className="text-muted-foreground border-b px-4 py-3 text-xs uppercase tracking-wider">
          Ultimele 30 zile
        </h3>
        {recent.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            Niciun rate înregistrat în ultimele 30 zile.
          </p>
        ) : (
          <ul className="divide-y">
            {recent.map((p) => (
              <li
                key={p.date}
                className="flex items-baseline justify-between px-4 py-2 text-sm"
              >
                <span className="text-muted-foreground tabular-nums">
                  {format(parseISO(p.date), "d MMM yyyy", { locale: ro })}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-muted-foreground text-[11px] uppercase">
                    {p.source}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatRate(p.rate)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
