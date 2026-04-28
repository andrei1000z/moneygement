"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Loader2, Plane, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  archiveTrip,
  createTrip,
  deleteTrip,
} from "@/app/(dashboard)/trips/actions";
import { suggestTag } from "@/lib/trips/slugify";
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
import { formatMoney, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

type TripWithStats = {
  id: string;
  name: string;
  country_code: string | null;
  started_on: string;
  ended_on: string | null;
  base_currency: string;
  budget_minor: number | null;
  tag: string;
  spent_minor: number;
  tx_count: number;
  days_until_start: number;
  days_since_end: number | null;
  is_active: boolean;
};

export function TripsScreen({ trips }: { trips: TripWithStats[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="eu" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" /> Adaugă călătorie
        </Button>
      </div>

      {trips.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </ul>
      )}

      <CreateTripSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="glass-thin rounded-(--radius-card) border-dashed p-10 text-center">
      <div className="bg-(--accent-blue)/10 text-(--accent-blue) mx-auto flex size-12 items-center justify-center rounded-full">
        <Plane className="size-5" aria-hidden />
      </div>
      <h3 className="mt-3 text-base font-semibold">Nicio călătorie încă</h3>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
        Crează un trip ca să grupăm tranzacțiile și să nu raportăm anomalii.
      </p>
      <Button variant="eu" onClick={onCreate} className="mt-5">
        <Plus className="mr-2 size-4" /> Prima călătorie
      </Button>
    </div>
  );
}

function TripCard({ trip }: { trip: TripWithStats }) {
  const [pending, start] = useTransition();
  const remainingDays =
    trip.is_active && trip.ended_on
      ? Math.max(
          0,
          Math.ceil(
            (parseISO(trip.ended_on).getTime() - Date.now()) / 86400000,
          ),
        )
      : null;

  const budgetPct =
    trip.budget_minor && trip.budget_minor > 0
      ? Math.min(1, trip.spent_minor / trip.budget_minor)
      : 0;
  const overBudget = !!(trip.budget_minor && trip.spent_minor > trip.budget_minor);

  function handleArchive() {
    start(async () => {
      const r = await archiveTrip(trip.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Călătorie arhivată");
    });
  }

  function handleDelete() {
    if (!confirm("Ștergi călătoria? Tag-ul rămâne pe tranzacții.")) return;
    start(async () => {
      const r = await deleteTrip(trip.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Călătorie ștearsă");
    });
  }

  const periodLabel = trip.ended_on
    ? `${format(parseISO(trip.started_on), "d MMM", { locale: ro })} – ${format(
        parseISO(trip.ended_on),
        "d MMM yyyy",
        { locale: ro },
      )}`
    : `Din ${format(parseISO(trip.started_on), "d MMM yyyy", { locale: ro })}`;

  return (
    <li className="glass-thin rounded-(--radius-card) p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              {trip.name}
            </h3>
            {trip.country_code ? (
              <span className="text-muted-foreground text-xs uppercase">
                {trip.country_code}
              </span>
            ) : null}
            {trip.is_active ? (
              <span className="bg-(--accent-blue)/12 text-(--accent-blue) rounded-full px-2 py-0.5 text-[10px] font-semibold">
                în curs
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">{periodLabel}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {!trip.is_active ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleArchive}
              disabled={pending}
              aria-label="Arhivează"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "✓"
              )}
            </Button>
          ) : null}
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Cheltuit"
          value={formatMoney(trip.spent_minor, trip.base_currency)}
          sub={`${trip.tx_count} tranzacții`}
        />
        {trip.budget_minor ? (
          <Stat
            label="Buget"
            value={formatMoney(trip.budget_minor, trip.base_currency)}
            sub={
              remainingDays !== null
                ? `${remainingDays} zile rămase`
                : trip.is_active
                  ? "în curs"
                  : "—"
            }
          />
        ) : (
          <Stat label="Buget" value="—" sub="Nedefinit" />
        )}
      </div>

      {trip.budget_minor ? (
        <div className="mt-3">
          <div className="bg-(--surface-hover-strong) relative h-2 overflow-hidden rounded-full">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500",
                overBudget
                  ? "bg-destructive"
                  : budgetPct > 0.8
                    ? "bg-(--accent-yellow)"
                    : "bg-(--accent-blue)",
              )}
              style={{ width: `${budgetPct * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {overBudget ? (
              <span className="text-destructive font-medium">
                Depășit cu{" "}
                {formatMoney(
                  trip.spent_minor - trip.budget_minor,
                  trip.base_currency,
                )}
              </span>
            ) : (
              <>
                Mai sunt{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {formatMoney(
                    Math.max(0, trip.budget_minor - trip.spent_minor),
                    trip.base_currency,
                  )}
                </span>
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="text-muted-foreground mt-3 inline-flex items-center gap-1.5 rounded-full text-[10px] uppercase tracking-wider">
        Tag:{" "}
        <code className="bg-(--surface-tint) text-foreground rounded px-1.5 py-0.5 font-mono normal-case">
          {trip.tag}
        </code>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
        {label}
      </p>
      <p className="num-hero mt-0.5 text-lg font-semibold tracking-tight">
        {value}
      </p>
      <p className="text-muted-foreground text-[11px]">{sub}</p>
    </div>
  );
}

function CreateTripSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [startedOn, setStartedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endedOn, setEndedOn] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("RON");

  function reset() {
    setName("");
    setCountry("");
    setStartedOn(new Date().toISOString().slice(0, 10));
    setEndedOn("");
    setBudget("");
    setCurrency("RON");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const year = parseInt(startedOn.slice(0, 4), 10);
    const tag = suggestTag(name, year);
    let budgetMinor: number | undefined;
    if (budget.trim()) {
      const n = parseFloat(budget.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Buget invalid");
        return;
      }
      budgetMinor = Number(toMinor(n, currency));
    }
    start(async () => {
      const res = await createTrip({
        name: name.trim(),
        country_code: country.trim().toUpperCase() || undefined,
        started_on: startedOn,
        ended_on: endedOn || undefined,
        base_currency: currency,
        budget_minor: budgetMinor,
        tag,
      });
      if (!res.ok) {
        toast.error("Creare eșuată", { description: res.error });
        return;
      }
      toast.success("Călătorie creată", {
        description: `Tag: ${tag} · ${res.data.tagged_count} tranzacții taggate`,
      });
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Adaugă călătorie</SheetTitle>
          <SheetDescription>
            Tag-ul auto-generat se aplică pe tranzacțiile din interval.
            Anomaly detector ignoră tranzacțiile cu tag de tip trip_*.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-4 space-y-4 px-4 pb-6">
          <div>
            <Label htmlFor="trip-name" className="mb-1.5 block">
              Nume
            </Label>
            <Input
              id="trip-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grecia 2026"
              required
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="trip-country" className="mb-1.5 block">
              Cod țară (opțional)
            </Label>
            <Input
              id="trip-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="GR"
              maxLength={2}
              className="uppercase"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="trip-start" className="mb-1.5 block">
                Început
              </Label>
              <Input
                id="trip-start"
                type="date"
                value={startedOn}
                onChange={(e) => setStartedOn(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="trip-end" className="mb-1.5 block">
                Sfârșit (opțional)
              </Label>
              <Input
                id="trip-end"
                type="date"
                value={endedOn}
                onChange={(e) => setEndedOn(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="trip-budget" className="mb-1.5 block">
                Buget (opțional)
              </Label>
              <Input
                id="trip-budget"
                type="text"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="3000"
              />
            </div>
            <div>
              <Label htmlFor="trip-currency" className="mb-1.5 block">
                Monedă
              </Label>
              <select
                id="trip-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="glass-thin h-12 w-full rounded-(--radius) border border-input px-4 text-base outline-none"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="eu" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Salvez…
              </>
            ) : (
              "Crează călătoria"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
