"use client";

import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, isSameDay, isToday, isYesterday, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

import { Skeleton } from "@/components/ui/skeleton";
import type { AccountRow } from "@/hooks/use-accounts";
import type { CategoryRow } from "@/hooks/use-categories";
import {
  useTransactions,
  type TransactionFilters,
  type TransactionRow as TxRow,
} from "@/hooks/use-transactions";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { TransactionRow } from "./transaction-row";

type Item =
  | { kind: "header"; date: string; total: number; currency: string }
  | { kind: "row"; tx: TxRow };

type Props = {
  filters: TransactionFilters;
  accounts: AccountRow[];
  categories: CategoryRow[];
  selectedIds: Set<string>;
  selectMode: boolean;
  onTxClick: (tx: TxRow) => void;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onSwipeAction: (
    tx: TxRow,
    action: "categorize" | "hide" | "reviewed" | "tag",
  ) => void;
};

function formatDayHeader(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Astăzi";
  if (isYesterday(d)) return "Ieri";
  return format(d, "EEEE, d MMM", { locale: ro }).replace(/^./, (c) =>
    c.toUpperCase(),
  );
}

export function TransactionList({
  filters,
  accounts,
  categories,
  selectedIds,
  selectMode,
  onTxClick,
  onToggleSelect,
  onLongPress,
  onSwipeAction,
}: Props) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useTransactions(filters);

  const accountById = useMemo(() => {
    const m = new Map<string, AccountRow>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  const categoryById = useMemo(() => {
    const m = new Map<string, CategoryRow>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const items = useMemo<Item[]>(() => {
    const all = (data?.pages ?? []).flatMap((p) => p.rows);
    if (all.length === 0) return [];
    const out: Item[] = [];
    let currentDay: string | null = null;
    let dayBuffer: TxRow[] = [];

    function flushDay() {
      if (dayBuffer.length === 0) return;
      // Calculăm totalul net al zilei (suma amount-urilor non-transfer / non-void).
      let total = 0;
      let currency = "RON";
      for (const tx of dayBuffer) {
        if (tx.is_transfer || tx.status === "void") continue;
        total += tx.amount;
        currency = tx.currency;
      }
      out.push({
        kind: "header",
        date: dayBuffer[0]!.occurred_on,
        total,
        currency,
      });
      for (const tx of dayBuffer) out.push({ kind: "row", tx });
    }

    for (const tx of all) {
      if (
        currentDay === null ||
        !isSameDay(parseISO(currentDay), parseISO(tx.occurred_on))
      ) {
        flushDay();
        dayBuffer = [];
        currentDay = tx.occurred_on;
      }
      dayBuffer.push(tx);
    }
    flushDay();
    return out;
  }, [data]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      return item?.kind === "header" ? 36 : 64;
    },
    overscan: 8,
  });

  // Infinite scroll trigger: când ne apropiem de coadă, fetch next.
  useEffect(() => {
    const last = virtualizer.getVirtualItems().at(-1);
    if (!last) return;
    if (
      last.index >= items.length - 6 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualizer,
    items.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    // re-run on virtualItems change
    virtualizer.getVirtualItems().length,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive m-4 rounded-xl border p-6 text-sm">
        Nu am putut încărca tranzacțiile.
        <p className="text-muted-foreground mt-1 text-xs">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-thin mx-4 my-6 flex flex-col items-center justify-center rounded-[--radius-card] border-dashed p-10 text-center">
        <h3 className="text-base font-semibold">Niciun rezultat</h3>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          Nicio tranzacție nu se potrivește filtrelor curente. Schimbă-le
          sau adaugă o tranzacție nouă.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="bg-card border-border/60 max-h-[calc(100svh-280px)] overflow-y-auto rounded-xl border"
    >
      <ul
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const item = items[vi.index]!;
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              {item.kind === "header" ? (
                <div
                  className={cn(
                    "bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-10 flex items-center justify-between border-y px-4 py-1.5 backdrop-blur",
                    "text-muted-foreground text-xs font-medium uppercase tracking-wider",
                  )}
                >
                  <span>{formatDayHeader(item.date)}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      item.total > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : item.total < 0
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.total === 0
                      ? ""
                      : `${item.total > 0 ? "+" : ""}${formatMoney(
                          item.total,
                          item.currency,
                        )}`}
                  </span>
                </div>
              ) : (
                <TransactionRow
                  tx={item.tx}
                  account={accountById.get(item.tx.account_id)}
                  category={
                    item.tx.category_id
                      ? categoryById.get(item.tx.category_id)
                      : undefined
                  }
                  selected={selectedIds.has(item.tx.id)}
                  selectMode={selectMode}
                  onClick={onTxClick}
                  onToggleSelect={onToggleSelect}
                  onLongPress={onLongPress}
                  onSwipeAction={onSwipeAction}
                />
              )}
            </div>
          );
        })}
      </ul>

      {isFetchingNextPage ? (
        <div className="text-muted-foreground p-4 text-center text-xs">
          Se încarcă mai multe…
        </div>
      ) : null}
    </div>
  );
}
