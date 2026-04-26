"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { moveMoney } from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BudgetProgressRow } from "@/hooks/use-budgets";
import { useInvalidateBudgets } from "@/hooks/use-budgets";
import type { CategoryRow } from "@/hooks/use-categories";
import { formatMoney } from "@/lib/money";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  categories: CategoryRow[];
  progress: BudgetProgressRow[];
  currency: string;
};

export function MoveMoneySheet({
  open,
  onOpenChange,
  month,
  categories,
  progress,
  currency,
}: Props) {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const invalidate = useInvalidateBudgets();

  const progressByCat = useMemo(() => {
    const m = new Map<string, BudgetProgressRow>();
    for (const p of progress) m.set(p.category_id, p);
    return m;
  }, [progress]);

  const fromBudget = from ? progressByCat.get(from) : null;
  const fromAvailable = fromBudget?.budget_amount ?? 0;

  function reset() {
    setFrom(null);
    setTo(null);
    setAmount(null);
  }

  function submit() {
    if (!from || !to) {
      toast.error("Selectează ambele categorii");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Sumă invalidă");
      return;
    }
    if (amount > fromAvailable) {
      toast.error("Suma depășește bugetul sursă");
      return;
    }
    startTransition(async () => {
      const r = await moveMoney({
        from_category_id: from,
        to_category_id: to,
        amount,
        month,
      });
      if (!r.ok) {
        toast.error("Mutare eșuată", { description: r.error });
        return;
      }
      toast.success("Bani mutați");
      await invalidate();
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? null : (reset(), onOpenChange(false)))}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Mută bani între bugete</SheetTitle>
          <SheetDescription>
            Decrementează din categoria sursă, incrementează în destinație
            (atomic).
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Din</label>
              <Select value={from ?? ""} onValueChange={setFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Sursă" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => {
                    const p = progressByCat.get(c.id);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                        {p ? (
                          <span className="text-muted-foreground ml-1 text-[11px] tabular-nums">
                            ({formatMoney(p.budget_amount, currency)})
                          </span>
                        ) : null}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight
              className="text-muted-foreground mb-2.5 size-4"
              aria-hidden
            />
            <div>
              <label className="mb-1 block text-xs font-medium">În</label>
              <Select value={to ?? ""} onValueChange={setTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Destinație" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.id !== from)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="mm-amt">
              Sumă
            </label>
            <CurrencyInput
              id="mm-amt"
              value={amount}
              onChange={(v) => setAmount(v ?? 0)}
              currency={currency}
              allowNegative={false}
            />
            {fromBudget ? (
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                Disponibil sursă: {formatMoney(fromAvailable, currency)}
              </p>
            ) : null}
          </div>

          <Button
            onClick={submit}
            className="w-full"
            disabled={
              pending || !from || !to || !amount || amount > fromAvailable
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                …
              </>
            ) : (
              "Mută"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
