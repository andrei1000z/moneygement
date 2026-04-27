"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { AlertTriangle, Wallet } from "lucide-react";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Lot = {
  id: string;
  top_up_date: string;
  amount: number;
  remaining: number;
  expires_on: string;
};

type Props = {
  account: {
    id: string;
    name: string;
    currency: string;
    current_balance: number;
  };
  lots: Lot[];
};

function daysUntil(iso: string): number {
  return Math.ceil((Date.parse(iso) - Date.now()) / 86400000);
}

export function MealVoucherCard({ account, lots }: Props) {
  const sorted = useMemo(
    () =>
      [...lots]
        .filter((l) => l.remaining > 0)
        .sort((a, b) => a.expires_on.localeCompare(b.expires_on)),
    [lots],
  );

  const expiringSoon = sorted.filter((l) => {
    const d = daysUntil(l.expires_on);
    return d >= 0 && d <= 60;
  });

  const expiringSoonTotal = expiringSoon.reduce(
    (acc, l) => acc + l.remaining,
    0,
  );
  const earliest = expiringSoon[0];

  return (
    <div className="glass-thin rounded-(--radius-card) p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Wallet className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium">{account.name}</p>
            <p className="text-muted-foreground text-xs">Tichete masă</p>
          </div>
        </div>
        <p className="text-2xl font-semibold tabular-nums">
          {formatMoney(account.current_balance, account.currency)}
        </p>
      </div>

      {expiringSoonTotal > 0 && earliest ? (
        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-300 mt-3 rounded-lg p-2 text-xs">
          <AlertTriangle className="mr-1.5 inline-block size-3" aria-hidden />
          Expiră în {daysUntil(earliest.expires_on)} zile:{" "}
          {formatMoney(expiringSoonTotal, account.currency)}
        </div>
      ) : null}

      {sorted.length > 0 ? (
        <div className="mt-3">
          <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wider">
            Loturi active ({sorted.length})
          </p>
          <ul className="divide-y">
            {sorted.slice(0, 5).map((l) => {
              const d = daysUntil(l.expires_on);
              const warn = d >= 0 && d <= 60;
              return (
                <li
                  key={l.id}
                  className="flex items-baseline justify-between py-1.5 text-xs"
                >
                  <div>
                    <p className="text-foreground">
                      {format(parseISO(l.top_up_date), "d MMM yyyy", {
                        locale: ro,
                      })}
                    </p>
                    <p
                      className={cn(
                        "text-[10px]",
                        warn
                          ? "text-amber-600 dark:text-amber-300"
                          : "text-muted-foreground",
                      )}
                    >
                      expiră{" "}
                      {format(parseISO(l.expires_on), "d MMM yyyy", {
                        locale: ro,
                      })}{" "}
                      {warn ? `(${d} zile)` : ""}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(l.remaining, account.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
          {sorted.length > 5 ? (
            <p className="text-muted-foreground mt-2 text-[10px]">
              +{sorted.length - 5} loturi mai vechi
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          Nu există loturi active. Importă tichete sau adaugă manual.
        </p>
      )}
    </div>
  );
}
