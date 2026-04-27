"use client";

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

import type { NetWorthPoint } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

type Props = {
  data: NetWorthPoint[];
  currency: string;
};

export function NetWorthChart({ data, currency }: Props) {
  const chartData = data.map((d) => ({
    month: format(parseISO(d.month), "MMM yy", { locale: ro }),
    value: d.totalMinor / 100,
  }));

  if (chartData.every((d) => d.value === 0)) {
    return (
      <div className="glass-thin text-muted-foreground flex h-72 items-center justify-center rounded-[--radius-card] text-sm">
        Niciun cont încă. Adaugă unul ca să vezi patrimoniul.
      </div>
    );
  }

  return (
    <div className="glass-thin rounded-[--radius-card] p-4">
      <h3 className="text-muted-foreground mb-3 text-xs uppercase tracking-wider">
        Patrimoniu — istoric
      </h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMoney(v * 100, currency)}
              width={80}
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
                const n = typeof value === "number" ? value : Number(value);
                return Number.isFinite(n) ? formatMoney(n * 100, currency) : "";
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
