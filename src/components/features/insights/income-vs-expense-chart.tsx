"use client";

import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthBar } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

type Props = {
  data: MonthBar[];
  currency: string;
};

export function IncomeVsExpenseChart({ data, currency }: Props) {
  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <div className="border-border/60 bg-card text-muted-foreground flex h-72 items-center justify-center rounded-xl border text-sm">
        Nicio tranzacție în perioada selectată.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    month: format(parseISO(d.month), "MMM yy", { locale: ro }),
    Venit: d.income / 100,
    Cheltuit: d.expense / 100,
  }));

  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <h3 className="text-muted-foreground mb-3 text-xs uppercase tracking-wider">
        Venit vs cheltuit
      </h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
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
              cursor={{ fill: "var(--accent)", opacity: 0.3 }}
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Venit" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cheltuit" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
