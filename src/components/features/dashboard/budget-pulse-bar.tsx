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
        className="border-border/60 bg-card hover:bg-accent/30 flex items-center justify-between rounded-xl border p-4 text-sm transition"
      >
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Buget lunar
          </p>
          <p className="mt-0.5">
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

  return (
    <Link
      href="/budgets"
      className="border-border/60 bg-card hover:bg-accent/30 block rounded-xl border p-4 transition"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Buget lunar
        </p>
        <p className="text-xs tabular-nums">
          <span className="font-semibold">
            {formatMoney(spent, ctx.baseCurrency)}
          </span>
          {" / "}
          {formatMoney(planned, ctx.baseCurrency)}
        </p>
      </div>
      <div
        className="bg-muted relative mt-2 h-2.5 overflow-hidden rounded-full"
        aria-hidden
      >
        <div
          className={
            overBudget
              ? "bg-destructive absolute inset-y-0 left-0"
              : spentPct > 0.85
              ? "bg-amber-500 absolute inset-y-0 left-0"
              : "bg-emerald-500 absolute inset-y-0 left-0"
          }
          style={{ width: `${spentPct * 100}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {overBudget
          ? `Ai depășit cu ${formatMoney(spent - planned, ctx.baseCurrency)}.`
          : daysLeft > 0
          ? `Mai ai ${formatMoney(remaining, ctx.baseCurrency)} pentru ${daysLeft} ${
              daysLeft === 1 ? "zi" : "zile"
            } (${formatMoney(dailyAvg, ctx.baseCurrency)}/zi).`
          : "Luna s-a încheiat."}
      </p>
    </Link>
  );
}
