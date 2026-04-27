"use client";

import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/money";

type Point = {
  date: string;
  projected: number;
  upper: number;
  lower: number;
};

type Props = {
  data: Point[];
  currency: string;
};

export function CashflowForecastChart({ data, currency }: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((p) => ({
    label: format(parseISO(p.date), "d MMM", { locale: ro }),
    projected: p.projected / 100,
    band: [p.lower / 100, p.upper / 100] as [number, number],
  }));

  return (
    <div className="h-40 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="cashflowBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border/30"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              typeof v === "number" ? formatMoney(v * 100, currency) : ""
            }
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 11,
            }}
            formatter={(value, name) => {
              if (name !== "projected") return null;
              if (value == null) return "";
              const n = typeof value === "number" ? value : Number(value);
              return Number.isFinite(n) ? formatMoney(n * 100, currency) : "";
            }}
          />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="url(#cashflowBand)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#10b981"
            strokeWidth={2}
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
