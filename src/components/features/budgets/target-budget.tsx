"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { upsertBudget } from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { CategoryRow } from "@/hooks/use-categories";
import {
  useInvalidateBudgets,
  type BudgetProgressRow,
} from "@/hooks/use-budgets";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { MoveMoneySheet } from "./move-money-sheet";

type Props = {
  month: string;
  categories: CategoryRow[];
  progress: BudgetProgressRow[];
  currency?: string;
};

type Status = "ok" | "warning" | "over" | "rolled" | "empty";

function statusOf(p: BudgetProgressRow): Status {
  if (p.budget_amount === 0) return "empty";
  const pct = p.spent / Math.max(1, p.budget_amount + p.rollover_in);
  if (pct > 1) return "over";
  if (pct >= 0.75) return "warning";
  if (p.rollover_in > 0) return "rolled";
  return "ok";
}

export function TargetBudget({ month, categories, progress, currency = "RON" }: Props) {
  const [editing, setEditing] = useState<{
    category: CategoryRow;
    progress: BudgetProgressRow | null;
  } | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  // Map progress by category for quick lookup.
  const progressByCat = useMemo(() => {
    const m = new Map<string, BudgetProgressRow>();
    for (const p of progress) m.set(p.category_id, p);
    return m;
  }, [progress]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMoveOpen(true)}
        >
          <RefreshCw className="size-4" aria-hidden /> Move money
        </Button>
      </div>

      <ul className="border-border/60 bg-card divide-y rounded-xl border">
        {expenseCategories.length === 0 ? (
          <li className="text-muted-foreground p-6 text-center text-sm">
            Nicio categorie de cheltuieli.
          </li>
        ) : null}
        {expenseCategories.map((c) => {
          const p = progressByCat.get(c.id);
          const status: Status = p ? statusOf(p) : "empty";
          const planned = p ? p.budget_amount + p.rollover_in : 0;
          const spent = p?.spent ?? 0;
          const pct = planned > 0 ? Math.min(1, spent / planned) : 0;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() =>
                  setEditing({ category: c, progress: p ?? null })
                }
                className="hover:bg-accent/40 grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 p-3 text-left transition"
              >
                <span className="text-xl" aria-hidden>
                  {c.icon ?? "📁"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-muted-foreground tabular-nums text-xs">
                    {p ? (
                      <>
                        {formatMoney(spent, currency)} /{" "}
                        {formatMoney(planned, currency)}
                        {p.rollover_in > 0 ? (
                          <span className="text-violet-500">
                            {" · "}↻{formatMoney(p.rollover_in, currency)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "Buget neset"
                    )}
                  </p>
                  {p ? (
                    <div
                      className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full"
                      aria-hidden
                    >
                      <div
                        className={cn(
                          "h-full transition-[width]",
                          status === "ok" && "bg-emerald-500",
                          status === "warning" && "bg-amber-500",
                          status === "over" && "bg-destructive",
                          status === "rolled" && "bg-violet-500",
                        )}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <Plus
                  className="text-muted-foreground size-4"
                  aria-label="Editează"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <BudgetEditSheet
        editing={editing}
        month={month}
        currency={currency}
        onClose={() => setEditing(null)}
      />

      <MoveMoneySheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        month={month}
        categories={expenseCategories}
        progress={progress}
        currency={currency}
      />
    </div>
  );
}

function BudgetEditSheet({
  editing,
  month,
  currency,
  onClose,
}: {
  editing: { category: CategoryRow; progress: BudgetProgressRow | null } | null;
  month: string;
  currency: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number | null>(null);
  const [rollover, setRollover] = useState(false);
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateBudgets();

  // Reset state when editing changes (re-mount via key).
  if (editing && amount === null) {
    setAmount(editing.progress?.budget_amount ?? 0);
    setRollover(editing.progress?.rollover ?? false);
  }
  if (!editing && amount !== null) {
    setAmount(null);
    setRollover(false);
  }

  function save() {
    if (!editing) return;
    if (amount === null || amount < 0) {
      toast.error("Sumă invalidă");
      return;
    }
    startTransition(async () => {
      const r = await upsertBudget({
        category_id: editing.category.id,
        month,
        amount,
        rollover,
      });
      if (!r.ok) {
        toast.error("Salvare eșuată", { description: r.error });
        return;
      }
      toast.success("Buget actualizat");
      await invalidate();
      onClose();
    });
  }

  return (
    <Sheet open={!!editing} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle>
            {editing ? `${editing.category.icon ?? "📁"} ${editing.category.name}` : ""}
          </SheetTitle>
          <SheetDescription>
            Setează limita pentru luna curentă. Activează rollover ca să
            transferi restul nefolosit la luna următoare.
          </SheetDescription>
        </SheetHeader>
        {editing ? (
          <div className="space-y-5 px-4 py-5">
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="bud-amt">
                Sumă lunară
              </label>
              <CurrencyInput
                id="bud-amt"
                value={amount}
                onChange={(v) => setAmount(v ?? 0)}
                currency={currency}
                allowNegative={false}
              />
            </div>
            <label className="border-border/60 bg-card flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">Rollover</p>
                <p className="text-muted-foreground text-xs">
                  Restul nefolosit se adaugă la luna următoare.
                </p>
              </div>
              <Switch checked={rollover} onCheckedChange={setRollover} />
            </label>
            {editing.progress ? (
              <p className="text-muted-foreground text-xs tabular-nums">
                Cheltuit luna asta: {formatMoney(editing.progress.spent, currency)}
                {editing.progress.rollover_in > 0
                  ? ` · Carry-over: ${formatMoney(
                      editing.progress.rollover_in,
                      currency,
                    )}`
                  : ""}
              </p>
            ) : null}
            <Button onClick={save} className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  …
                </>
              ) : (
                "Salvează"
              )}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
