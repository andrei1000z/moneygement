import { Suspense } from "react";

import { AnniversariesWidget } from "@/components/features/dashboard/anniversaries-widget";
import { BudgetPulseBar } from "@/components/features/dashboard/budget-pulse-bar";
import { CashflowForecastWidget } from "@/components/features/dashboard/cashflow-forecast-widget";
import { GoalsProgress } from "@/components/features/dashboard/goals-progress";
import { GreetingCard } from "@/components/features/dashboard/greeting-card";
import { HeatmapSection } from "@/components/features/dashboard/heatmap-section";
import { KpiRow } from "@/components/features/dashboard/kpi-row";
import { NetWorthHeadline } from "@/components/features/dashboard/net-worth-headline";
import { NextIncomeWidget } from "@/components/features/dashboard/next-income-widget";
import { OnboardingSection } from "@/components/features/dashboard/onboarding-section";
import { RecentTransactions } from "@/components/features/dashboard/recent-transactions";
import { SankeySection } from "@/components/features/dashboard/sankey-section";
import { SeasonalPrompt } from "@/components/features/dashboard/seasonal-prompt";
import { UpcomingBills } from "@/components/features/dashboard/upcoming-bills";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? "h-24 w-full rounded-xl"} />;
}

export default function DashboardHome() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-5 md:px-8 md:py-8">
      <Suspense fallback={<CardSkeleton className="h-16 w-full rounded-xl" />}>
        <GreetingCard />
      </Suspense>

      <Suspense fallback={null}>
        <OnboardingSection />
      </Suspense>

      <Suspense fallback={<CardSkeleton className="h-28 w-full rounded-xl" />}>
        <NetWorthHeadline />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        }
      >
        <KpiRow />
      </Suspense>

      <Suspense fallback={<CardSkeleton className="h-24 w-full rounded-xl" />}>
        <BudgetPulseBar />
      </Suspense>

      <SeasonalPrompt />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={null}>
          <NextIncomeWidget />
        </Suspense>
        <Suspense fallback={null}>
          <AnniversariesWidget />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton className="h-56 w-full rounded-xl" />}>
        <CashflowForecastWidget />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton className="h-72 w-full rounded-xl" />}>
          <SankeySection />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="h-32 w-full rounded-xl" />}>
          <HeatmapSection days={84} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton className="h-64 w-full rounded-xl" />}>
          <RecentTransactions />
        </Suspense>
        <Suspense fallback={<CardSkeleton className="h-64 w-full rounded-xl" />}>
          <UpcomingBills />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton className="h-32 w-full rounded-xl" />}>
        <GoalsProgress />
      </Suspense>
    </div>
  );
}
