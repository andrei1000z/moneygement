"use client";

import { useRef } from "react";
import { motion, type PanInfo } from "motion/react";
import { ArrowLeftRight, Check, EyeOff, Tag, Tags } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import type { AccountRow } from "@/hooks/use-accounts";
import type { CategoryRow } from "@/hooks/use-categories";
import type { TransactionRow } from "@/hooks/use-transactions";
import { formatMoneyParts } from "@/lib/money";
import { cn } from "@/lib/utils";

const REVEAL = 100;

const OWNERSHIP_BADGE: Record<TransactionRow["ownership"], string> = {
  mine: "👤",
  yours: "🤝",
  shared: "👥",
};

type Props = {
  tx: TransactionRow;
  account?: AccountRow;
  category?: CategoryRow;
  selected?: boolean;
  selectMode?: boolean;
  onClick?: (tx: TransactionRow) => void;
  onToggleSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onSwipeAction?: (
    tx: TransactionRow,
    action: "categorize" | "hide" | "reviewed" | "tag",
  ) => void;
};

export function TransactionRow({
  tx,
  account,
  category,
  selected,
  selectMode,
  onClick,
  onToggleSelect,
  onLongPress,
  onSwipeAction,
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startLongPress() {
    if (!onLongPress) return;
    longPressTimer.current = setTimeout(() => onLongPress(tx.id), 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const dx = info.offset.x;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) {
      // Swipe LEFT: categorize sau hide. Folosim distanța ca să decidem.
      onSwipeAction?.(tx, dx < -180 ? "hide" : "categorize");
    } else {
      onSwipeAction?.(tx, dx > 180 ? "tag" : "reviewed");
    }
  }

  const parts = formatMoneyParts(tx.amount, tx.currency);
  const isIncome = tx.amount > 0;
  const isPending = tx.status === "pending";
  const isVoid = tx.status === "void";

  return (
    <li className="relative overflow-hidden">
      {/* Action backdrops (revealed by swipe) */}
      <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 absolute inset-y-0 left-0 flex w-1/2 items-center justify-start gap-3 px-4 text-xs font-medium">
        <Check className="size-4" aria-hidden />
        <span>Marchează revizuit</span>
        <Tags className="ml-auto size-4" aria-hidden />
      </div>
      <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 absolute inset-y-0 right-0 flex w-1/2 items-center justify-end gap-3 px-4 text-xs font-medium">
        <Tag className="size-4" aria-hidden />
        <span>Categorisește</span>
        <EyeOff className="ml-auto size-4" aria-hidden />
      </div>

      <motion.div
        drag={selectMode ? false : "x"}
        dragConstraints={{ left: -REVEAL * 2, right: REVEAL * 2 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative flex items-center gap-3 px-4 py-3 transition-colors",
          isIncome
            ? "bg-[--tint-emerald-row]"
            : "bg-[--bg-base-tint] backdrop-blur-md",
          isVoid && "opacity-50",
          selected && "bg-[--tint-emerald-soft]",
        )}
        onClick={(e) => {
          if (selectMode) {
            onToggleSelect?.(tx.id);
            return;
          }
          // Filtrăm click-urile de la swipe.
          if (
            e.target instanceof HTMLElement &&
            e.target.closest("[data-no-row-click]")
          ) {
            return;
          }
          onClick?.(tx);
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
      >
        {selectMode ? (
          <div data-no-row-click className="shrink-0">
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onToggleSelect?.(tx.id)}
              aria-label={`Selectează tranzacția ${tx.payee ?? ""}`}
            />
          </div>
        ) : (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-base"
            style={{
              background: category?.color
                ? `color-mix(in oklch, ${category.color}, transparent 80%)`
                : "color-mix(in oklch, var(--foreground), transparent 94%)",
              boxShadow: category?.color
                ? `inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 0 1px color-mix(in oklch, ${category.color}, transparent 80%)`
                : "inset 0 1px 0 oklch(1 0 0 / 0.04)",
            }}
            aria-hidden
          >
            {category?.icon ?? (tx.is_transfer ? "↔" : "💸")}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {tx.payee ?? "—"}
            </p>
            {tx.is_transfer ? (
              <ArrowLeftRight
                className="text-muted-foreground size-3.5 shrink-0"
                aria-label="Transfer"
              />
            ) : null}
            {isPending ? (
              <span
                className="bg-amber-500/80 size-1.5 shrink-0 rounded-full"
                aria-label="În așteptare"
              />
            ) : null}
            <span
              className="text-muted-foreground ml-auto shrink-0 text-xs"
              aria-label={
                tx.ownership === "mine"
                  ? "A mea"
                  : tx.ownership === "yours"
                  ? "A celuilalt"
                  : "Comună"
              }
            >
              {OWNERSHIP_BADGE[tx.ownership]}
            </span>
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {[
              category?.name ?? (tx.is_transfer ? "Transfer" : "Necategorisit"),
              account?.name,
              ...(tx.tags && tx.tags.length > 0 ? [tx.tags.join(" · ")] : []),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div
          className={cn(
            "shrink-0 text-right tabular-nums slashed-zero font-semibold",
            isIncome ? "text-[--accent-emerald]" : "text-foreground",
          )}
          aria-label={`${isIncome ? "+" : ""}${parts.integer}${
            parts.separator
          }${parts.decimal} ${parts.symbol}`}
        >
          <span aria-hidden>
            {parts.sign || (isIncome ? "+" : "")}
            {parts.integer}
            {parts.separator}
            <span className="text-[0.8em] font-medium opacity-80">
              {parts.decimal}
            </span>
          </span>
          <div
            className="text-muted-foreground text-[10px] font-medium"
            aria-hidden
          >
            {parts.symbol}
          </div>
        </div>
      </motion.div>
    </li>
  );
}
