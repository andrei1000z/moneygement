import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDashboardContext, getRecentTransactions } from "@/lib/dashboard";
import { formatMoneyParts } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function RecentTransactions() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const tx = await getRecentTransactions(ctx, 5);

  // Pre-fetch categories pentru afișarea iconilor.
  const { data: categories } = await ctx.supabase
    .from("categories")
    .select("id, name, icon, color");
  const catById = new Map(
    (categories ?? []).map((c) => [c.id, c]),
  );

  if (tx.length === 0) {
    return (
      <div className="glass-thin rounded-[--radius-card] p-4">
        <h3 className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]">
          Tranzacții recente
        </h3>
        <p className="text-muted-foreground text-sm">
          Niciuna încă. Adaugă o tranzacție din butonul „+&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-thin overflow-hidden rounded-[--radius-card]">
      <div className="flex items-baseline justify-between border-b border-[--glass-border] px-4 py-3">
        <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Tranzacții recente
        </h3>
        <Link
          href="/transactions"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Vezi toate →
        </Link>
      </div>
      <ul className="divide-y divide-[--glass-border]">
        {tx.map((t) => {
          const cat = t.category_id ? catById.get(t.category_id) : null;
          const parts = formatMoneyParts(t.amount, t.currency);
          const isIncome = t.amount > 0;
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[--surface-tint-faint]"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                style={{
                  background: cat?.color
                    ? `color-mix(in oklch, ${cat.color}, transparent 80%)`
                    : "color-mix(in oklch, var(--foreground), transparent 94%)",
                  boxShadow: cat?.color
                    ? `inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 0 1px color-mix(in oklch, ${cat.color}, transparent 80%)`
                    : "inset 0 1px 0 oklch(1 0 0 / 0.04)",
                }}
                aria-hidden
              >
                {cat?.icon ?? (t.is_transfer ? "↔" : "💸")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-medium">{t.payee ?? "—"}</p>
                  {t.is_transfer ? (
                    <ArrowLeftRight
                      className="text-muted-foreground size-3"
                      aria-hidden
                      strokeWidth={1.75}
                    />
                  ) : null}
                  {!t.category_id && !t.is_transfer ? (
                    <Badge variant="amber" className="h-4 px-1 text-[9px]">
                      Review
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground truncate text-[11px]">
                  {cat?.name ?? "Necategorisit"}
                </p>
              </div>
              <span
                className={cn(
                  "tabular-nums text-right text-sm font-semibold",
                  isIncome ? "text-[--accent-emerald]" : "text-foreground",
                )}
              >
                {isIncome ? "+" : parts.sign}
                {parts.integer}
                {parts.separator}
                <span className="text-[0.8em] opacity-70">
                  {parts.decimal}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
