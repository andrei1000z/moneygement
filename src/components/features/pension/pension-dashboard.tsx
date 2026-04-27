"use client";

import { useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addContribution,
  deleteContribution,
} from "@/app/(dashboard)/pension/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ANNUAL_CAP_EUR = 400;

type Contribution = {
  id: string;
  year: number;
  contribution_date: string;
  amount_eur: number;
  amount_ron: number | null;
  provider: string | null;
  notes: string | null;
};

type Props = {
  currentYear: number;
  contributions: Contribution[];
  eurToRon: number | null;
};

export function PensionDashboard({
  currentYear,
  contributions,
  eurToRon,
}: Props) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [amountEur, setAmountEur] = useState<string>("");
  const [provider, setProvider] = useState<string>("");

  const byYear = useMemo(() => {
    const map = new Map<number, Contribution[]>();
    for (const c of contributions) {
      const arr = map.get(c.year) ?? [];
      arr.push(c);
      map.set(c.year, arr);
    }
    return map;
  }, [contributions]);

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  function totalForYear(y: number) {
    return (byYear.get(y) ?? []).reduce(
      (acc, c) => acc + Number(c.amount_eur),
      0,
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = amountEur.replace(/\s+/g, "").replace(/,/g, ".");
    const num = Number.parseFloat(cleaned);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Introdu o sumă validă în EUR");
      return;
    }
    start(async () => {
      const ronEstimate =
        eurToRon !== null
          ? Math.round(num * eurToRon * 100)
          : null;
      const res = await addContribution({
        contribution_date: date,
        amount_eur: num,
        amount_ron: ronEstimate,
        provider: provider.trim() || null,
        notes: null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAmountEur("");
      setProvider("");
      toast.success("Contribuție adăugată");
    });
  }

  function remove(id: string) {
    if (!window.confirm("Ștergi contribuția?")) return;
    start(async () => {
      const res = await deleteContribution(id);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {years.map((year) => {
        const total = totalForYear(year);
        const remaining = Math.max(0, ANNUAL_CAP_EUR - total);
        const pct = Math.min(100, (total / ANNUAL_CAP_EUR) * 100);
        const isCurrent = year === currentYear;
        const remainingRon =
          eurToRon !== null ? remaining * eurToRon : null;
        return (
          <section
            key={year}
            className="glass-thin rounded-(--radius-card) p-4"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{year}</h2>
              <p className="tabular-nums text-sm">
                <span className="font-semibold">{total.toFixed(2)} EUR</span>
                <span className="text-muted-foreground">
                  {" "}
                  / {ANNUAL_CAP_EUR}
                </span>
              </p>
            </div>
            <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-all",
                  pct >= 100
                    ? "bg-emerald-500"
                    : pct >= 75
                      ? "bg-emerald-400"
                      : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            {isCurrent && remaining > 0 ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Mai poți deduce {remaining.toFixed(2)} EUR
                {remainingRon !== null
                  ? ` (≈ ${remainingRon.toFixed(0)} lei la cursul de azi)`
                  : ""}
                .
              </p>
            ) : null}

            {(byYear.get(year) ?? []).length > 0 ? (
              <ul className="mt-3 divide-y">
                {(byYear.get(year) ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-baseline justify-between py-2 text-sm"
                  >
                    <div>
                      <p className="text-foreground">
                        {format(parseISO(c.contribution_date), "d MMM yyyy", {
                          locale: ro,
                        })}
                      </p>
                      {c.provider ? (
                        <p className="text-muted-foreground text-xs">
                          {c.provider}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="tabular-nums font-semibold">
                        {c.amount_eur.toFixed(2)} EUR
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(c.id)}
                        aria-label="Șterge"
                      >
                        <Trash2 className="text-muted-foreground size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-3 text-xs">
                Nicio contribuție în {year}.
              </p>
            )}
          </section>
        );
      })}

      <section className="glass-thin rounded-(--radius-card) p-4">
        <h2 className="mb-3 text-sm font-semibold">Adaugă contribuție</h2>
        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <div>
            <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
              Data
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
              Sumă (EUR)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={amountEur}
              onChange={(e) => setAmountEur(e.target.value)}
              placeholder="40,00"
              required
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
              Provider
            </label>
            <Input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="NN, BCR Pensii…"
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Adaugă
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
