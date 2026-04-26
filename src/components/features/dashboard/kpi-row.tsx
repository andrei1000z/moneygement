import { ArrowDownRight, ArrowUpRight, PiggyBank } from "lucide-react";

import { KpiCard } from "@/components/features/dashboard/kpi-card";
import {
  getDashboardContext,
  getMonthlyKpis,
} from "@/lib/dashboard";

function thisMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function lastMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export async function KpiRow() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const [thisMonth, lastMonth] = await Promise.all([
    getMonthlyKpis(ctx, thisMonthIso()),
    getMonthlyKpis(ctx, lastMonthIso()),
  ]);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <KpiCard
        label="Venit"
        amount={thisMonth.income}
        currency={ctx.baseCurrency}
        Icon={ArrowUpRight}
        tone="positive"
        delta={thisMonth.income - lastMonth.income}
      />
      <KpiCard
        label="Cheltuit"
        amount={thisMonth.expense}
        currency={ctx.baseCurrency}
        Icon={ArrowDownRight}
        tone="neutral"
        delta={thisMonth.expense - lastMonth.expense}
      />
      <KpiCard
        label="Economisit"
        amount={Math.max(0, thisMonth.saved)}
        currency={ctx.baseCurrency}
        Icon={PiggyBank}
        tone="info"
        delta={thisMonth.saved - lastMonth.saved}
      />
    </div>
  );
}
