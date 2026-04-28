"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  addObligation,
  deleteObligation,
  toggleObligation,
} from "@/app/(dashboard)/eur-obligations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatMoney, toMinor } from "@/lib/money";

type Obligation = {
  id: string;
  label: string;
  amount_eur: number;
  day_of_month: number;
  is_active: boolean;
  notes: string | null;
};

type HistoryPoint = {
  obligation_id: string;
  label: string;
  rate_date: string;
  eur_to_ron: number;
  estimated_ron_minor: number;
};

type Props = {
  obligations: Obligation[];
  currentRate: number | null;
  yearAgoRate: number | null;
  history: HistoryPoint[];
};

export function EurObligationsScreen({
  obligations,
  currentRate,
  yearAgoRate,
  history,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const summary = useMemo(() => {
    const active = obligations.filter((o) => o.is_active);
    const totalEur = active.reduce((acc, o) => acc + Number(o.amount_eur), 0);
    const totalRonNow = currentRate
      ? Math.round((totalEur * currentRate) / 100) * 100
      : null;
    const totalRonYearAgo = yearAgoRate
      ? Math.round((totalEur * yearAgoRate) / 100) * 100
      : null;
    const delta =
      totalRonNow != null && totalRonYearAgo != null
        ? totalRonNow - totalRonYearAgo
        : null;
    return { totalEur, totalRonNow, totalRonYearAgo, delta };
  }, [obligations, currentRate, yearAgoRate]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="eu" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" /> Adaugă obligație
        </Button>
      </div>

      {summary.totalEur > 0 ? (
        <SummaryBanner
          totalEur={summary.totalEur}
          totalRonNow={summary.totalRonNow}
          delta={summary.delta}
          currentRate={currentRate}
        />
      ) : null}

      {obligations.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <ul className="space-y-2">
          {obligations.map((o) => (
            <ObligationCard
              key={o.id}
              obligation={o}
              currentRate={currentRate}
              yearAgoRate={yearAgoRate}
              history={history.filter((h) => h.obligation_id === o.id)}
            />
          ))}
        </ul>
      )}

      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function SummaryBanner({
  totalEur,
  totalRonNow,
  delta,
  currentRate,
}: {
  totalEur: number;
  totalRonNow: number | null;
  delta: number | null;
  currentRate: number | null;
}) {
  const deltaPct =
    delta && totalRonNow ? ((delta / (totalRonNow - delta)) * 100).toFixed(1) : null;
  return (
    <div className="glass-thin rounded-(--radius-card) p-4">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
        Total obligații EUR / lună
      </p>
      <p className="num-hero mt-1 text-2xl font-semibold">
        {formatMoney(totalEur, "EUR")}
        {totalRonNow != null ? (
          <span className="text-muted-foreground ml-2 text-base font-normal">
            ≈ {formatMoney(totalRonNow, "RON")}
          </span>
        ) : null}
      </p>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 text-xs">
        {currentRate ? (
          <span>Curs BNR azi: {currentRate.toFixed(4)} RON/EUR</span>
        ) : null}
        {delta != null && deltaPct ? (
          <span
            className={
              delta > 0
                ? "text-destructive font-medium"
                : "text-emerald-600 dark:text-emerald-400 font-medium"
            }
          >
            {delta > 0 ? "▲" : "▼"} {Math.abs(Number(deltaPct))}% vs anul trecut
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="glass-thin rounded-(--radius-card) border-dashed p-10 text-center">
      <div className="bg-(--accent-yellow)/12 text-(--accent-yellow) mx-auto flex size-12 items-center justify-center rounded-full">
        <Wallet className="size-5" aria-hidden />
      </div>
      <h3 className="mt-3 text-base font-semibold">Nicio obligație în EUR</h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        Pentru chirie, asigurări sau alte plăți denominate în euro.
      </p>
      <Button variant="eu" onClick={onCreate} className="mt-5">
        <Plus className="mr-2 size-4" /> Prima obligație
      </Button>
    </div>
  );
}

function ObligationCard({
  obligation,
  currentRate,
  yearAgoRate,
  history,
}: {
  obligation: Obligation;
  currentRate: number | null;
  yearAgoRate: number | null;
  history: HistoryPoint[];
}) {
  const [pending, start] = useTransition();
  const ronNow = currentRate
    ? Math.round((Number(obligation.amount_eur) * currentRate) / 100) * 100
    : null;
  const ronYearAgo = yearAgoRate
    ? Math.round((Number(obligation.amount_eur) * yearAgoRate) / 100) * 100
    : null;
  const delta = ronNow != null && ronYearAgo != null ? ronNow - ronYearAgo : null;

  function handleToggle(active: boolean) {
    start(async () => {
      const r = await toggleObligation(obligation.id, active);
      if (!r.ok) toast.error(r.error);
    });
  }

  function handleDelete() {
    if (!confirm("Ștergi obligația?")) return;
    start(async () => {
      const r = await deleteObligation(obligation.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Obligație ștearsă");
    });
  }

  // Min/max pentru chart simplu inline.
  const points = history.slice(-30); // ultimele 30 de zile cu rate
  let minRon = Number.POSITIVE_INFINITY;
  let maxRon = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (p.estimated_ron_minor < minRon) minRon = p.estimated_ron_minor;
    if (p.estimated_ron_minor > maxRon) maxRon = p.estimated_ron_minor;
  }
  const range = maxRon - minRon;

  return (
    <li className="glass-thin rounded-(--radius-card) p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight">
            {obligation.label}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Ziua {obligation.day_of_month} a lunii ·{" "}
            {formatMoney(Number(obligation.amount_eur), "EUR")}
            {ronNow != null ? (
              <>
                {" "}
                ≈{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {formatMoney(ronNow, "RON")}
                </span>
              </>
            ) : null}
          </p>
          {delta != null ? (
            <p
              className={
                "mt-1 text-xs " +
                (delta > 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400")
              }
            >
              {delta > 0 ? "▲" : "▼"} {formatMoney(Math.abs(delta), "RON")} vs
              acum 12 luni
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={obligation.is_active}
            onCheckedChange={handleToggle}
            disabled={pending}
            aria-label="Activ"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Șterge"
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {points.length >= 4 && range > 0 ? (
        <div className="mt-3">
          <svg
            viewBox={`0 0 ${points.length * 10} 30`}
            preserveAspectRatio="none"
            className="h-8 w-full"
          >
            <polyline
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth="1.5"
              points={points
                .map((p, i) => {
                  const x = i * 10;
                  const y = 30 - ((p.estimated_ron_minor - minRon) / range) * 28 - 1;
                  return `${x},${y.toFixed(2)}`;
                })
                .join(" ")}
            />
          </svg>
          <p className="text-muted-foreground mt-1 text-[10px]">
            FX impact ultimele {points.length} puncte ·{" "}
            {formatMoney(minRon, "RON")} – {formatMoney(maxRon, "RON")}
          </p>
        </div>
      ) : null}

      {obligation.notes ? (
        <p className="text-muted-foreground mt-3 text-xs">{obligation.notes}</p>
      ) : null}
    </li>
  );
}

function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("Chirie apartament");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [notes, setNotes] = useState("");

  function reset() {
    setLabel("Chirie apartament");
    setAmount("");
    setDay("1");
    setNotes("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Sumă invalidă");
      return;
    }
    const dayNum = parseInt(day, 10);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
      toast.error("Ziua trebuie 1–31");
      return;
    }
    const amountMinor = Number(toMinor(amountNum, "EUR"));
    start(async () => {
      const res = await addObligation({
        label: label.trim(),
        amount_eur: amountMinor,
        day_of_month: dayNum,
        notes: notes.trim() || null,
        is_active: true,
      });
      if (!res.ok) {
        toast.error("Adăugare eșuată", { description: res.error });
        return;
      }
      toast.success("Obligație EUR adăugată");
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Adaugă obligație EUR</SheetTitle>
          <SheetDescription>
            Pentru chirie, asigurări sau alte plăți denominate în euro.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-4 space-y-4 px-4 pb-6">
          <div>
            <Label htmlFor="obl-label" className="mb-1.5 block">
              Etichetă
            </Label>
            <Input
              id="obl-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Chirie apartament"
              maxLength={100}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="obl-amount" className="mb-1.5 block">
                Sumă (EUR)
              </Label>
              <Input
                id="obl-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="350"
                required
              />
            </div>
            <div>
              <Label htmlFor="obl-day" className="mb-1.5 block">
                Ziua plății
              </Label>
              <Input
                id="obl-day"
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="obl-notes" className="mb-1.5 block">
              Notițe (opțional)
            </Label>
            <Input
              id="obl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contract până în iunie 2027"
              maxLength={500}
            />
          </div>
          <Button type="submit" variant="eu" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Salvez…
              </>
            ) : (
              "Adaugă obligația"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
