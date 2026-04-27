"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { splitTransaction } from "@/app/(dashboard)/transactions/actions";
import type { SplitItem } from "@/lib/validation/transactions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/use-categories";
import type { TransactionRow } from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionRow;
  onDone?: () => void;
};

type DraftRow = {
  id: string;
  amount: number;
  category_id: string | null;
  notes: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function SplitModal({ open, onOpenChange, transaction, onDone }: Props) {
  const isExpense = transaction.amount < 0;
  const totalAbs = Math.abs(transaction.amount);
  const sign = transaction.amount < 0 ? -1 : 1;

  const [rows, setRows] = useState<DraftRow[]>(() => [
    { id: uid(), amount: 0, category_id: null, notes: "" },
    { id: uid(), amount: 0, category_id: null, notes: "" },
  ]);
  const [pending, startTransition] = useTransition();
  const { data: categoriesAll } = useCategories();

  const filteredCategories = useMemo(
    () =>
      (categoriesAll ?? []).filter(
        (c) => c.type === (isExpense ? "expense" : "income"),
      ),
    [categoriesAll, isExpense],
  );

  const usedAbs = rows.reduce((acc, r) => acc + Math.abs(r.amount), 0);
  const remainingAbs = totalAbs - usedAbs;
  const balanced = remainingAbs === 0;

  function update(id: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: uid(), amount: 0, category_id: null, notes: "" },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 2 ? prev : prev.filter((r) => r.id !== id)));
  }

  function autoBalance() {
    const empty = rows.filter((r) => r.amount === 0);
    if (empty.length === 0) {
      toast.info("Niciun rând gol pentru auto-balance");
      return;
    }
    const per = Math.floor(remainingAbs / empty.length);
    let leftover = remainingAbs - per * empty.length;
    setRows((prev) =>
      prev.map((r) => {
        if (r.amount !== 0) return r;
        const extra = leftover > 0 ? 1 : 0;
        leftover -= extra;
        return { ...r, amount: per + extra };
      }),
    );
  }

  function submit() {
    if (!balanced) {
      toast.error("Suma split-urilor nu egalează totalul");
      return;
    }
    if (rows.some((r) => r.amount === 0)) {
      toast.error("Toate rândurile trebuie să aibă o sumă");
      return;
    }
    startTransition(async () => {
      const splits: SplitItem[] = rows.map((r) => ({
        amount: sign * Math.abs(r.amount),
        category_id: r.category_id,
        notes: r.notes.trim() || null,
      }));
      const r = await splitTransaction(transaction.id, splits);
      if (!r.ok) {
        toast.error("Split eșuat", { description: r.error });
        return;
      }
      toast.success(`Split în ${r.data.ids.length} tranzacții`);
      onDone?.();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>Split tranzacție</DialogTitle>
          <DialogDescription>
            Total {formatMoney(totalAbs, transaction.currency)} · {transaction.payee ?? "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {rows.map((r, idx) => (
            <div
              key={r.id}
              className="glass-thin space-y-2 rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Rândul {idx + 1}
                </span>
                {rows.length > 2 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(r.id)}
                    aria-label="Șterge rândul"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <CurrencyInput
                value={r.amount === 0 ? null : r.amount}
                onChange={(v) => update(r.id, { amount: v ?? 0 })}
                currency={transaction.currency}
                allowNegative={false}
              />
              <Select
                value={r.category_id ?? "__none__"}
                onValueChange={(v) =>
                  update(r.id, { category_id: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— necategorisit</SelectItem>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Notițe (opțional)"
                value={r.notes}
                onChange={(e) => update(r.id, { notes: e.target.value })}
              />
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-4" aria-hidden /> Adaugă rând
            </Button>
            <Button variant="outline" size="sm" onClick={autoBalance}>
              <Scale className="size-4" aria-hidden /> Auto-balance
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-3">
          <div className="flex w-full items-center justify-between gap-3">
            <div
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium tabular-nums",
                balanced
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}
            >
              {formatMoney(usedAbs, transaction.currency)} /{" "}
              {formatMoney(totalAbs, transaction.currency)}
              <span className="ml-1">
                {balanced
                  ? "✓ balansat"
                  : `· rămas ${formatMoney(
                      Math.abs(remainingAbs),
                      transaction.currency,
                    )}`}
              </span>
            </div>
            <Button onClick={submit} disabled={pending || !balanced}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Se aplică…
                </>
              ) : (
                "Aplică split"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
