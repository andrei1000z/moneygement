import type { LucideIcon } from "lucide-react";

import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  amount: number;
  currency: string;
  Icon: LucideIcon;
  tone?: "positive" | "neutral" | "info";
  delta?: number;
};

export function KpiCard({ label, amount, currency, Icon, tone = "neutral", delta }: Props) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "info"
      ? "text-sky-600 dark:text-sky-400"
      : "text-foreground";
  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums md:text-2xl",
          toneClass,
        )}
      >
        {amount === 0 ? "—" : formatMoney(amount, currency)}
      </p>
      {delta !== undefined && delta !== 0 ? (
        <p
          className={cn(
            "mt-0.5 text-[11px] tabular-nums",
            delta > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground",
          )}
        >
          {delta > 0 ? "+" : ""}
          {((delta / Math.max(1, amount)) * 100).toFixed(1)}% vs luna trecută
        </p>
      ) : null}
    </div>
  );
}
