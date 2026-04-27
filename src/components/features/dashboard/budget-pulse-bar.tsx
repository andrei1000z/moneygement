import Link from "next/link";
import { differenceInDays, lastDayOfMonth } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { getDashboardContext } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

function thisMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export async function BudgetPulseBar() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const monthIso = thisMonthIso();
  const { data: progress } = await supabase.rpc("budget_progress", {
    _hh: ctx.householdId,
    _month: monthIso,
  });

  if (!progress || progress.length === 0) {
    return (
      <Link
        href="/budgets"
        className="glass-thin specular flex items-center justify-between rounded-(--radius-card) p-4 text-sm transition-transform duration-200 hover:scale-[1.005]"
      >
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
            Buget lunar
          </p>
          <p className="mt-1">
            Setează un buget ca să-ți urmărești progresul.
          </p>
        </div>
        <span className="text-muted-foreground text-xs">→</span>
      </Link>
    );
  }

  let budgeted = 0;
  let spent = 0;
  let rolloverIn = 0;
  for (const p of progress) {
    budgeted += p.budget_amount;
    spent += p.spent;
    rolloverIn += p.rollover_in;
  }
  const planned = budgeted + rolloverIn;
  const remaining = Math.max(0, planned - spent);
  const overBudget = spent > planned && planned > 0;
  const spentPct = planned > 0 ? Math.min(1, spent / planned) : 0;

  const today = new Date();
  const lastDay = lastDayOfMonth(today);
  const daysLeft = Math.max(0, differenceInDays(lastDay, today)) + 1;
  const dailyAvg = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;

  // Background gradient pe progress bar:
  // - <50% emerald solid
  // - 50-85% emerald → amber
  // - 85-100% amber → destructive
  // - >100% destructive solid
  const gradient = overBudget
    ? "linear-gradient(90deg, var(--destructive), var(--destructive))"
    : spentPct > 0.85
      ? "linear-gradient(90deg, var(--accent-blue), var(--accent-yellow), var(--destructive))"
      : spentPct > 0.5
        ? "linear-gradient(90deg, var(--accent-blue), var(--accent-yellow))"
        : "linear-gradient(90deg, var(--accent-blue), var(--accent-blue-bright))";

  return (
    <Link
      href="/budgets"
      className="glass-thin specular block rounded-(--radius-card) p-4 transition-transform duration-200 hover:scale-[1.005]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Buget lunar
        </p>
        <p className="text-xs tabular-nums">
          <span className="font-semibold text-foreground">
            {formatMoney(spent, ctx.baseCurrency)}
          </span>
          <span className="text-muted-foreground">
            {" / "}
            {formatMoney(planned, ctx.baseCurrency)}
          </span>
        </p>
      </div>
      <div
        className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-(--surface-hover-strong)"
        aria-hidden
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{
            width: `${spentPct * 100}%`,
            background: gradient,
            boxShadow: overBudget
              ? "0 0 12px -2px color-mix(in oklch, var(--destructive), transparent 50%)"
              : spentPct > 0.85
                ? "0 0 12px -2px color-mix(in oklch, var(--accent-yellow), transparent 50%)"
                : "0 0 14px -2px color-mix(in oklch, var(--accent-blue), transparent 50%)",
          }}
        />
      </div>
      <p className="mt-3 text-xs">
        {overBudget ? (
          <span className="font-medium text-destructive">
            Ai depășit cu {formatMoney(spent - planned, ctx.baseCurrency)}.
          </span>
        ) : daysLeft > 0 ? (
          <>
            <span className="text-muted-foreground">Mai ai </span>
            <span className="font-semibold text-foreground">
              {formatMoney(remaining, ctx.baseCurrency)}
            </span>
            <span className="text-muted-foreground">
              {" "}pentru {daysLeft} {daysLeft === 1 ? "zi" : "zile"} (
              {formatMoney(dailyAvg, ctx.baseCurrency)}/zi).
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Luna s-a încheiat.</span>
        )}
      </p>
    </Link>
  );
}
