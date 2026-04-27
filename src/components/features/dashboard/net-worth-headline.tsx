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
      className="glass specular relative flex items-end justify-between gap-4 overflow-hidden rounded-(--radius-card) p-5 transition-transform duration-200 hover:scale-[1.005]"
    >
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
          Patrimoniu
        </p>
        <p
          className={`num-hero mt-2 text-3xl md:text-4xl ${
            positive ? "text-gradient-emerald" : "text-foreground"
          }`}
        >
          {formatMoney(nw.totalMinor, nw.currency)}
        </p>
        {history.length > 1 ? (
          <p
            className={`mt-2 text-xs tabular-nums ${
              positive ? "text-(--accent-emerald)" : "text-destructive"
            }`}
          >
            {positive ? "▲ +" : "▼ −"}
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
