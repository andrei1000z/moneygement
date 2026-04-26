import { Suspense } from "react";

import { CategoryTreemap } from "@/components/features/insights/category-treemap";
import { IncomeVsExpenseChart } from "@/components/features/insights/income-vs-expense-chart";
import { NetWorthChart } from "@/components/features/insights/net-worth-chart";
import {
  PeriodSelector,
  periodToMonths,
  type Period,
} from "@/components/features/insights/period-selector";
import { HeatmapSection } from "@/components/features/dashboard/heatmap-section";
import { MiniSankey } from "@/components/features/dashboard/mini-sankey";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCategoryTreemap,
  getDashboardContext,
  getIncomeVsExpense,
  getNetWorthHistory,
  getSankeyData,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string }>;

function thisMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function CardSkeleton({ height = "h-72" }: { height?: string }) {
  return <Skeleton className={`${height} w-full rounded-xl`} />;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const period: Period = (params.period as Period) ?? "6M";
  const months = periodToMonths(period);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Insights
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Banii pe larg
          </h1>
        </div>
        <PeriodSelector current={period} />
      </header>

      <Suspense fallback={<CardSkeleton />}>
        <NetWorthSection months={months} />
      </Suspense>

      <Suspense fallback={<CardSkeleton />}>
        <IncomeVsExpenseSection months={months} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <SankeyFullSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <TreemapSection />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton height="h-32" />}>
        <HeatmapSection days={365} />
      </Suspense>
    </div>
  );
}

async function NetWorthSection({ months }: { months: number }) {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const data = await getNetWorthHistory(ctx, months);
  return <NetWorthChart data={data} currency={ctx.baseCurrency} />;
}

async function IncomeVsExpenseSection({ months }: { months: number }) {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const data = await getIncomeVsExpense(ctx, months);
  return <IncomeVsExpenseChart data={data} currency={ctx.baseCurrency} />;
}

async function SankeyFullSection() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const data = await getSankeyData(ctx, thisMonthIso());
  return <MiniSankey data={data} currency={ctx.baseCurrency} />;
}

async function TreemapSection() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const data = await getCategoryTreemap(ctx, thisMonthIso());
  return <CategoryTreemap data={data} currency={ctx.baseCurrency} />;
}
