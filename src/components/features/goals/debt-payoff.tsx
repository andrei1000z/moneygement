"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { simulatePayoff, type Debt, type Strategy } from "@/lib/debt";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  /** Datorii deja înrolate (1+ pentru calc). */
  debts: Debt[];
};

export function DebtPayoff({ debts }: Props) {
  const [extra, setExtra] = useState<number>(0);

  const snowball = useMemo(
    () => simulatePayoff(debts, "snowball", extra),
    [debts, extra],
  );
  const avalanche = useMemo(
    () => simulatePayoff(debts, "avalanche", extra),
    [debts, extra],
  );

  const savings = snowball.totalInterestMinor - avalanche.totalInterestMinor;
  const recommendation: Strategy =
    avalanche.totalInterestMinor < snowball.totalInterestMinor
      ? "avalanche"
      : "snowball";

  return (
    <div className="space-y-5">
      <div className="glass-thin rounded-(--radius-card) p-4">
        <p className="text-xs font-medium uppercase tracking-wider">
          Plată extra lunară
        </p>
        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
          <input
            type="range"
            min={0}
            max={100000}
            step={1000}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            className="accent-primary w-full"
          />
          <div className="w-32">
            <CurrencyInput
              value={extra}
              onChange={(v) => setExtra(v ?? 0)}
              currency="RON"
              allowNegative={false}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StrategyCard
          plan={snowball}
          title="Snowball"
          description="Începe cu cea mai mică datorie. Wins early, motivație continuă."
          recommended={recommendation === "snowball"}
        />
        <StrategyCard
          plan={avalanche}
          title="Avalanche"
          description="Începe cu cea mai mare dobândă. Mai puțin total plătit."
          recommended={recommendation === "avalanche"}
        />
      </div>

      {savings > 0 ? (
        <div className="border-emerald-500/40 bg-emerald-500/5 rounded-xl border p-4 text-sm">
          💡 Avalanche economisește{" "}
          <strong className="tabular-nums">
            {formatMoney(savings, "RON")}
          </strong>{" "}
          în dobândă față de Snowball, dacă rămâi disciplinat.
        </div>
      ) : null}
    </div>
  );
}

function StrategyCard({
  plan,
  title,
  description,
  recommended,
}: {
  plan: ReturnType<typeof simulatePayoff>;
  title: string;
  description: string;
  recommended: boolean;
}) {
  const months = plan.monthsToPayoff;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const timeLabel =
    years === 0
      ? `${months} luni`
      : remainder === 0
      ? `${years} ${years === 1 ? "an" : "ani"}`
      : `${years} ${years === 1 ? "an" : "ani"} și ${remainder} luni`;

  return (
    <div
      className={cn(
        "glass-thin relative space-y-3 rounded-(--radius-card) p-4",
        recommended && "border-emerald-500 ring-emerald-500/30 ring-2",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {recommended ? (
          <Badge className="bg-emerald-500 hover:bg-emerald-500">
            Recomandat
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Timp până la zero
          </dt>
          <dd className="text-base font-semibold tabular-nums">{timeLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[10px] uppercase tracking-wider">
            Total dobândă
          </dt>
          <dd className="text-base font-semibold tabular-nums">
            {formatMoney(plan.totalInterestMinor, "RON")}
          </dd>
        </div>
      </dl>
      {/* Mini-chart cu balance over time */}
      <BalanceChart history={plan.history} />
    </div>
  );
}

function BalanceChart({
  history,
}: {
  history: ReturnType<typeof simulatePayoff>["history"];
}) {
  if (history.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">Niciun balance plătit.</p>
    );
  }
  const max = Math.max(...history.map((h) => h.totalBalance));
  const points = history.map((h, i) => {
    const x = (i / Math.max(1, history.length - 1)) * 100;
    const y = max > 0 ? 100 - (h.totalBalance / max) * 100 : 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-16 w-full"
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        strokeWidth={1.5}
        className="stroke-primary"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Re-export pentru convenience: simple form helper de adăugat datorii.
export function DebtInputRow({
  debt,
  onChange,
  onRemove,
}: {
  debt: Debt;
  onChange: (d: Debt) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="glass-thin grid grid-cols-[1fr_120px_80px_120px] items-end gap-2 rounded-xl p-3">
      <div>
        <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider">
          Datorie
        </label>
        <Input
          value={debt.name}
          onChange={(e) => onChange({ ...debt, name: e.target.value })}
          placeholder="Card credit"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider">
          Balance
        </label>
        <CurrencyInput
          value={debt.balanceMinor}
          onChange={(v) => onChange({ ...debt, balanceMinor: v ?? 0 })}
          currency="RON"
          allowNegative={false}
        />
      </div>
      <div>
        <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider">
          APR %
        </label>
        <Input
          type="number"
          step="0.5"
          value={(debt.apr * 100).toFixed(1)}
          onChange={(e) =>
            onChange({ ...debt, apr: Number(e.target.value) / 100 })
          }
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wider">
            Min. lunar
          </label>
          <CurrencyInput
            value={debt.minPaymentMinor}
            onChange={(v) => onChange({ ...debt, minPaymentMinor: v ?? 0 })}
            currency="RON"
            allowNegative={false}
          />
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive text-xs"
            aria-label="Elimină"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
