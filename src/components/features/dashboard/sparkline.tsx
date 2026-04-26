"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

type Props = {
  data: Array<{ value: number }>;
  className?: string;
  positive?: boolean;
};

export function Sparkline({ data, className, positive = true }: Props) {
  if (data.length < 2) return null;
  const id = positive ? "sparklinePos" : "sparklineNeg";
  return (
    <div className={cn("h-10 w-32", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={positive ? "#10b981" : "#ef4444"}
                stopOpacity={0.4}
              />
              <stop
                offset="100%"
                stopColor={positive ? "#10b981" : "#ef4444"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={positive ? "#10b981" : "#ef4444"}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
