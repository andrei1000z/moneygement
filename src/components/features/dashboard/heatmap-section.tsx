import { getDailySpending, getDashboardContext } from "@/lib/dashboard";

import { SpendingHeatmap } from "./calendar-heatmap";
import "./heatmap.css";

export async function HeatmapSection({ days = 84 }: { days?: number }) {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const daily = await getDailySpending(ctx, days);
  return (
    <SpendingHeatmap daily={daily} currency={ctx.baseCurrency} days={days} />
  );
}
