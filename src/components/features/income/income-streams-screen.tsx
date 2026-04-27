"use client";

import { useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { detectIncomes } from "@/app/(dashboard)/income/actions";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
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

  function rescan() {
    start(async () => {
      const res = await detectIncomes();
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.data.detected} surse detectate`);
    });
  }

  const active = streams.filter((s) => s.is_active);
  const inactive = streams.filter((s) => !s.is_active);

  return (
    <div className="space-y-4">
      <div className="glass-thin flex items-center justify-between rounded-[--radius-card] p-4">
        <p className="text-muted-foreground text-xs">
          {streams.length === 0
            ? "Nicio sursă încă. Apasă „Detectează” pentru a analiza istoricul."
            : `${active.length} active${inactive.length ? `, ${inactive.length} inactive` : ""}`}
        </p>
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
      </div>

      {active.length > 0 ? (
        <ul className="space-y-2">
          {active.map((s) => {
            const days = daysUntil(s.next_expected_on);
            return (
              <li
                key={s.id}
                className="glass-thin rounded-[--radius-card] p-4"
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
                  <span className="text-muted-foreground">
                    {s.source === "auto" ? "auto" : "manual"} ·{" "}
                    {Math.round(s.confidence * 100)}% încredere
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
