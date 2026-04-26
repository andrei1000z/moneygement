"use client";

import { useMemo } from "react";
import { differenceInDays, lastDayOfMonth, parseISO } from "date-fns";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BudgetProgressRow } from "@/hooks/use-budgets";

type Props = {
  month: string;
  progress: BudgetProgressRow[];
  currency?: string;
};

export function BudgetSummary({ month, progress, currency = "RON" }: Props) {
  const totals = useMemo(() => {
    let budgeted = 0;
    let spent = 0;
    let rolloverIn = 0;
    for (const p of progress) {
      budgeted += p.budget_amount;
      spent += p.spent;
      rolloverIn += p.rollover_in;
    }
    const planned = budgeted + rolloverIn;
    const remaining = planned - spent;
    return { budgeted, spent, planned, remaining, rolloverIn };
  }, [progress]);

  const monthDate = parseISO(month);
  const today = new Date();
  const lastDay = lastDayOfMonth(monthDate);
  const daysLeft =
    today < monthDate
      ? differenceInDays(lastDay, monthDate) + 1
      : Math.max(0, differenceInDays(lastDay, today));

  const overBudget = totals.spent > totals.planned && totals.planned > 0;
  const spentPct =
    totals.planned > 0 ? Math.min(1, totals.spent / totals.planned) : 0;
  const overflowPct =
    overBudget && totals.spent > totals.planned
      ? Math.min(1, (totals.spent - totals.planned) / Math.max(1, totals.planned))
      : 0;

  return (
    <section className="border-border/60 bg-card space-y-3 rounded-xl border p-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Bugetat" value={formatMoney(totals.planned, currency)} />
        <Stat label="Cheltuit" value={formatMoney(totals.spent, currency)} />
        <Stat
          label={overBudget ? "Depășit" : "Rămas"}
          value={formatMoney(Math.abs(totals.remaining), currency)}
          tone={
            overBudget ? "negative" : totals.remaining > 0 ? "positive" : "neutral"
          }
        />
      </div>

      <div
        className="bg-muted relative h-2.5 overflow-hidden rounded-full"
        aria-hidden
      >
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500 transition-[width]"
          style={{ width: `${(1 - spentPct) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-zinc-400 dark:bg-zinc-600 transition-[width]"
          style={{ width: `${spentPct * 100}%` }}
        />
        {overBudget ? (
          <div
            className="absolute inset-y-0 right-0 bg-destructive transition-[width]"
            style={{ width: `${overflowPct * 100}%` }}
          />
        ) : null}
      </div>

      {totals.planned > 0 ? (
        <p className="text-muted-foreground text-xs">
          {overBudget
            ? `Ai depășit cu ${formatMoney(
                Math.abs(totals.remaining),
                currency,
              )} planul lunii.`
            : daysLeft > 0
            ? `Mai ai ${formatMoney(
                Math.max(0, totals.remaining),
                currency,
              )} pentru ${daysLeft} ${daysLeft === 1 ? "zi" : "zile"}.`
            : "Luna s-a încheiat — vezi recap-ul."}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Nu ai bugete setate. Adaugă unul mai jos ca să primești progres.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "text-base font-semibold tabular-nums",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
