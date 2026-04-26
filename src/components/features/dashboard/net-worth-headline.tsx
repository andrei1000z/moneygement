import Link from "next/link";

import { Sparkline } from "@/components/features/dashboard/sparkline";
import { getDashboardContext, getNetWorth, getNetWorthHistory } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

export async function NetWorthHeadline() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;

  const [nw, history] = await Promise.all([
    getNetWorth(ctx),
    getNetWorthHistory(ctx, 6),
  ]);

  const last = history[history.length - 1]?.totalMinor ?? nw.totalMinor;
  const prev = history.length > 1
    ? history[history.length - 2]!.totalMinor
    : last;
  const delta = last - prev;
  const pct = prev !== 0 ? Math.abs(delta) / Math.abs(prev) : 0;
  const positive = delta >= 0;

  const sparklineData = history.map((h) => ({ value: h.totalMinor / 100 }));

  return (
    <Link
      href="/insights"
      className="border-border/60 bg-card hover:bg-accent/30 flex items-end justify-between gap-4 rounded-xl border p-5 transition"
    >
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Patrimoniu
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl">
          {formatMoney(nw.totalMinor, nw.currency)}
        </p>
        {history.length > 1 ? (
          <p
            className={`mt-1 text-xs tabular-nums ${
              positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {positive ? "+" : "−"}
            {formatMoney(Math.abs(delta), nw.currency)}
            {" · "}
            {(pct * 100).toFixed(1)}% luna asta
          </p>
        ) : null}
        {nw.byCurrency.length > 1 ? (
          <p className="text-muted-foreground mt-1 text-[11px]">
            {nw.byCurrency
              .map((c) => `${formatMoney(c.totalMinor, c.currency)} ${c.currency}`)
              .join(" · ")}
          </p>
        ) : null}
      </div>
      <Sparkline data={sparklineData} positive={positive} />
    </Link>
  );
}
