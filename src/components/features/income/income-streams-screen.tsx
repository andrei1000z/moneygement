"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import {
  CalendarClock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  addIncomeStream,
  deleteIncomeStream,
  detectIncomes,
} from "@/app/(dashboard)/income/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatMoney, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

type Stream = {
  id: string;
  name: string;
  payer: string | null;
  expected_amount: number;
  expected_currency: string;
  expected_day_of_month: number | null;
  cadence_days: number;
  confidence: number;
  is_active: boolean;
  source: "auto" | "manual";
  last_seen_on: string | null;
  next_expected_on: string | null;
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((Date.parse(iso) - Date.now()) / 86400000);
}

export function IncomeStreamsScreen({ streams }: { streams: Stream[] }) {
  const [pending, start] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  function rescan() {
    start(async () => {
      const res = await detectIncomes();
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.data.detected} surse detectate`);
    });
  }

  function handleDelete(id: string) {
    start(async () => {
      const res = await deleteIncomeStream(id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Sursă ștearsă");
    });
  }

  const active = streams.filter((s) => s.is_active);
  const inactive = streams.filter((s) => !s.is_active);

  return (
    <div className="space-y-4">
      <div className="glass-thin flex flex-wrap items-center justify-between gap-3 rounded-(--radius-card) p-4">
        <p className="text-muted-foreground text-xs">
          {streams.length === 0
            ? "Nicio sursă încă. Adaugă manual sau apasă „Detectează”."
            : `${active.length} active${inactive.length ? `, ${inactive.length} inactive` : ""}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={rescan}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Detectează
          </Button>
          <Button
            variant="eu"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={pending}
          >
            <Plus className="mr-2 size-4" />
            Adaugă salariu
          </Button>
        </div>
      </div>

      <AddIncomeSheet open={addOpen} onOpenChange={setAddOpen} />


      {active.length > 0 ? (
        <ul className="space-y-2">
          {active.map((s) => {
            const days = daysUntil(s.next_expected_on);
            return (
              <li
                key={s.id}
                className="glass-thin rounded-(--radius-card) p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.payer ? (
                      <p className="text-muted-foreground truncate text-xs capitalize">
                        {s.payer}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-base font-semibold tabular-nums">
                    {formatMoney(s.expected_amount, s.expected_currency)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  {days !== null ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        days <= 3
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      <CalendarClock className="size-3" aria-hidden />
                      {days < 0
                        ? `întârziat cu ${-days} zile`
                        : days === 0
                          ? "azi"
                          : `peste ${days} zile`}
                      {s.next_expected_on
                        ? ` · ${format(parseISO(s.next_expected_on), "d MMM", { locale: ro })}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    {s.source === "auto" ? "auto" : "manual"} ·{" "}
                    {Math.round(s.confidence * 100)}% încredere
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="hover:text-destructive transition-colors"
                      aria-label="Șterge sursă"
                    >
                      <Trash2 className="size-3" aria-hidden />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {inactive.length > 0 ? (
        <details className="opacity-70">
          <summary className="text-muted-foreground cursor-pointer px-2 py-1 text-xs">
            {inactive.length} surse inactive
          </summary>
          <ul className="mt-2 space-y-1">
            {inactive.map((s) => (
              <li
                key={s.id}
                className="text-muted-foreground border-l-2 px-3 py-1 text-xs"
              >
                {s.name}: {formatMoney(s.expected_amount, s.expected_currency)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function AddIncomeSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("Salariu");
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("RON");
  const [day, setDay] = useState("");
  const [cadence, setCadence] = useState("30");

  function reset() {
    setName("Salariu");
    setPayer("");
    setAmount("");
    setCurrency("RON");
    setDay("");
    setCadence("30");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Suma e invalidă");
      return;
    }
    const minor = Number(toMinor(amountNum, currency));
    const dayNum = day ? parseInt(day, 10) : undefined;
    const cadenceNum = parseInt(cadence, 10) || 30;

    start(async () => {
      const res = await addIncomeStream({
        name: name.trim(),
        payer: payer.trim() || name.trim(),
        expected_amount: minor,
        expected_currency: currency,
        expected_day_of_month: dayNum,
        cadence_days: cadenceNum,
        is_active: true,
      });
      if (!res.ok) {
        toast.error("Adăugare eșuată", { description: res.error });
        return;
      }
      toast.success("Salariu adăugat");
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Adaugă sursă de venit</SheetTitle>
          <SheetDescription>
            Salariu, pensie, freelance sau orice plată recurentă.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-4 space-y-4 px-4 pb-6">
          <div>
            <Label htmlFor="inc-name" className="mb-1.5 block">
              Nume
            </Label>
            <Input
              id="inc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Salariu, Pensie, Freelance…"
              required
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="inc-payer" className="mb-1.5 block">
              Plătitor (companie)
            </Label>
            <Input
              id="inc-payer"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
              placeholder="SRL Companie / CAS"
              maxLength={200}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="inc-amount" className="mb-1.5 block">
                Sumă lunară
              </Label>
              <Input
                id="inc-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="6500"
                required
              />
            </div>
            <div>
              <Label htmlFor="inc-currency" className="mb-1.5 block">
                Monedă
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="inc-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RON">RON</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="inc-day" className="mb-1.5 block">
                Zi în lună
              </Label>
              <Input
                id="inc-day"
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="15"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Lăsat gol = nu așteptăm o zi anume.
              </p>
            </div>
            <div>
              <Label htmlFor="inc-cadence" className="mb-1.5 block">
                Frecvență (zile)
              </Label>
              <Select value={cadence} onValueChange={setCadence}>
                <SelectTrigger id="inc-cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Săptămânal (7)</SelectItem>
                  <SelectItem value="14">Bilunar (14)</SelectItem>
                  <SelectItem value="30">Lunar (30)</SelectItem>
                  <SelectItem value="90">Trimestrial (90)</SelectItem>
                  <SelectItem value="365">Anual (365)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" variant="eu" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Salvez…
              </>
            ) : (
              "Adaugă sursă"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
