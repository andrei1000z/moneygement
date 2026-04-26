import { getDashboardContext, getSankeyData } from "@/lib/dashboard";

import { MiniSankey } from "./mini-sankey";

function thisMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export async function SankeySection() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const data = await getSankeyData(ctx, thisMonthIso());
  return <MiniSankey data={data} currency={ctx.baseCurrency} />;
}
