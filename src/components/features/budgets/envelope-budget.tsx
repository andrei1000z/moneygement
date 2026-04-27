"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  setReadyToAssign,
  upsertBudget,
} from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  useInvalidateBudgets,
  type BudgetProgressRow,
} from "@/hooks/use-budgets";
import type { CategoryRow } from "@/hooks/use-categories";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  month: string;
  categories: CategoryRow[];
  progress: BudgetProgressRow[];
  income: number;
  currency?: string;
};

export function EnvelopeBudget({
  month,
  categories,
  progress,
  income,
  currency = "RON",
}: Props) {
  const expenseCats = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const progressByCat = useMemo(() => {
    const m = new Map<string, BudgetProgressRow>();
    for (const p of progress) m.set(p.category_id, p);
    return m;
  }, [progress]);

  const totalAssigned = progress.reduce((acc, p) => acc + p.budget_amount, 0);
  const readyToAssign = income - totalAssigned;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateBudgets();

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setDraft(progressByCat.get(c.id)?.budget_amount ?? 0);
  }

  function commit() {
    if (!editingId) return;
    const value = draft ?? 0;
    startTransition(async () => {
      const r = await upsertBudget({
        category_id: editingId,
        month,
        amount: value,
        rollover: progressByCat.get(editingId)?.rollover ?? false,
      });
      if (!r.ok) {
        toast.error("Eroare", { description: r.error });
        return;
      }
      await invalidate();
      setEditingId(null);
      setDraft(null);
    });
  }

  function autoAssign() {
    // Distribuie Ready to Assign proporțional cu consumul curent (sau egal
    // dacă nu există istoric pentru luna asta).
    if (readyToAssign <= 0) {
      toast.info("Nu ai bani de alocat");
      return;
    }
    const eligible = expenseCats.filter((c) => {
      const p = progressByCat.get(c.id);
      return !p || p.budget_amount === 0;
    });
    if (eligible.length === 0) {
      toast.info("Toate categoriile au deja sumă alocată");
      return;
    }
    const per = Math.floor(readyToAssign / eligible.length);
    let remainder = readyToAssign - per * eligible.length;
    const allocations = eligible.map((c) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return { category_id: c.id, amount: per + extra };
    });
    startTransition(async () => {
      const r = await setReadyToAssign({ month, allocations });
      if (!r.ok) {
        toast.error("Auto-assign eșuat", { description: r.error });
        return;
      }
      toast.success(`Alocate ${allocations.length} categorii`);
      await invalidate();
    });
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border p-4 text-center",
          readyToAssign > 0
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
            : readyToAssign < 0
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "glass-thin",
        )}
      >
        <p className="text-xs uppercase tracking-wider">Ready to Assign</p>
        <p className="text-3xl font-semibold tabular-nums">
          {readyToAssign === 0
            ? "—"
            : `${readyToAssign > 0 ? "+" : ""}${formatMoney(
                readyToAssign,
                currency,
              )}`}
        </p>
        <p className="mt-1 text-xs opacity-80">
          Venit: {formatMoney(income, currency)} · Alocat:{" "}
          {formatMoney(totalAssigned, currency)}
        </p>
        {readyToAssign > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={autoAssign}
            disabled={pending}
          >
            Auto-assign
          </Button>
        ) : null}
      </div>

      <div className="glass-thin overflow-hidden rounded-(--radius-card)">
        <div className="bg-muted/40 grid grid-cols-[1fr_120px_120px_120px] items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider">
          <span>Categorie</span>
          <span className="text-right">Alocat</span>
          <span className="text-right">Cheltuit</span>
          <span className="text-right">Disponibil</span>
        </div>
        <ul className="divide-y">
          {expenseCats.map((c) => {
            const p = progressByCat.get(c.id);
            const assigned = p?.budget_amount ?? 0;
            const spent = p?.spent ?? 0;
            const available = (p?.available ?? 0) - (p?.rollover_in ?? 0);
            const isEditing = editingId === c.id;
            return (
              <li
                key={c.id}
                className="grid grid-cols-[1fr_120px_120px_120px] items-center gap-2 px-3 py-2.5 text-sm"
              >
                <span className="truncate">
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </span>
                {isEditing ? (
                  <div className="col-span-1">
                    <CurrencyInput
                      value={draft}
                      onChange={(v) => setDraft(v ?? 0)}
                      currency={currency}
                      allowNegative={false}
                      autoFocus
                      onBlur={commit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="hover:bg-accent/40 rounded px-2 py-1 text-right tabular-nums"
                  >
                    {assigned > 0 ? formatMoney(assigned, currency) : "—"}
                  </button>
                )}
                <span className="text-right tabular-nums">
                  {spent > 0 ? formatMoney(spent, currency) : "—"}
                </span>
                <span
                  className={cn(
                    "text-right tabular-nums",
                    available < 0
                      ? "text-destructive"
                      : available > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {available !== 0 ? formatMoney(available, currency) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {pending ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Se salvează…
        </p>
      ) : null}
    </div>
  );
}
