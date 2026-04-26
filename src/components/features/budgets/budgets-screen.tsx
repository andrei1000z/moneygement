"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { copyPreviousMonth } from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import {
  useBudgetProgress,
  useInvalidateBudgets,
  useMonthIncome,
} from "@/hooks/use-budgets";

import { BudgetSummary } from "./budget-summary";
import { EnvelopeBudget } from "./envelope-budget";
import { MonthPicker } from "./month-picker";
import { TargetBudget } from "./target-budget";

function thisMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

type Mode = "target" | "envelope";

export function BudgetsScreen() {
  const [month, setMonth] = useState<string>(thisMonth());
  const [mode, setMode] = useState<Mode>("target");

  const { data: categories } = useCategories();
  const { data: progress, isLoading } = useBudgetProgress(month);
  const { data: income } = useMonthIncome(month);
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateBudgets();

  function handleCopyPrev() {
    startTransition(async () => {
      const r = await copyPreviousMonth(month);
      if (!r.ok) {
        toast.error("Copiere eșuată", { description: r.error });
        return;
      }
      toast.success(`${r.data.count} bugete copiate`);
      await invalidate();
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Bugete
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Cât planifici, cât folosești
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPrev}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            Copiază luna anterioară
          </Button>
        </div>
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="target">Target-based</TabsTrigger>
          <TabsTrigger value="envelope">Envelope (YNAB)</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <BudgetSummary month={month} progress={progress ?? []} />
            <TabsContent value="target">
              <TargetBudget
                month={month}
                categories={categories ?? []}
                progress={progress ?? []}
              />
            </TabsContent>
            <TabsContent value="envelope">
              <EnvelopeBudget
                month={month}
                categories={categories ?? []}
                progress={progress ?? []}
                income={income ?? 0}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
