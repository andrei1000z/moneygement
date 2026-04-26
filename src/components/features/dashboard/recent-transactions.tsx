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
      <div className="border-border/60 bg-card rounded-xl border p-4">
        <h3 className="text-muted-foreground mb-2 text-xs uppercase tracking-wider">
          Tranzacții recente
        </h3>
        <p className="text-muted-foreground text-sm">
          Niciuna încă. Adaugă o tranzacție din butonul „+&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border/60 bg-card rounded-xl border">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h3 className="text-muted-foreground text-xs uppercase tracking-wider">
          Tranzacții recente
        </h3>
        <Link
          href="/transactions"
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Vezi toate →
        </Link>
      </div>
      <ul className="divide-y">
        {tx.map((t) => {
          const cat = t.category_id ? catById.get(t.category_id) : null;
          const parts = formatMoneyParts(t.amount, t.currency);
          const isIncome = t.amount > 0;
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-base"
                style={{
                  backgroundColor: cat?.color
                    ? `${cat.color}20`
                    : "var(--muted)",
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
                    />
                  ) : null}
                  {!t.category_id && !t.is_transfer ? (
                    <Badge variant="outline" className="h-4 px-1 text-[9px]">
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
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground",
                )}
              >
                {isIncome ? "+" : parts.sign}
                {parts.integer}
                {parts.separator}
                <span className="text-[0.8em] opacity-80">{parts.decimal}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
