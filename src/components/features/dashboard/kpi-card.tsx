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

export function KpiCard({
  label,
  amount,
  currency,
  Icon,
  tone = "neutral",
  delta,
}: Props) {
  const accentClass =
    tone === "positive"
      ? "text-[--accent-emerald]"
      : tone === "info"
        ? "text-[--accent-cyan]"
        : "text-foreground";

  const iconBg =
    tone === "positive"
      ? "color-mix(in oklch, var(--accent-blue), transparent 85%)"
      : tone === "info"
        ? "color-mix(in oklch, var(--accent-blue-bright), transparent 85%)"
        : "color-mix(in oklch, var(--foreground), transparent 94%)";
  const iconColor =
    tone === "positive"
      ? "text-[--accent-emerald]"
      : tone === "info"
        ? "text-[--accent-cyan]"
        : "text-muted-foreground";

  return (
    <div className="glass-thin specular relative overflow-hidden rounded-[--radius-card] p-4">
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]"
        >
          {label}
        </span>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          <Icon
            className={cn("size-4", iconColor)}
            aria-hidden
            strokeWidth={1.75}
          />
        </span>
      </div>
      <p className={cn("num-hero mt-2 text-2xl md:text-[1.65rem]", accentClass)}>
        {amount === 0 ? "—" : formatMoney(amount, currency)}
      </p>
      {delta !== undefined && delta !== 0 ? (
        <p
          className={cn(
            "mt-1 text-[11px] tabular-nums",
            delta > 0 ? "text-[--accent-emerald]" : "text-muted-foreground",
          )}
        >
          {delta > 0 ? "▲ +" : "▼ "}
          {((delta / Math.max(1, amount)) * 100).toFixed(1)}% vs luna trecută
        </p>
      ) : null}
    </div>
  );
}
