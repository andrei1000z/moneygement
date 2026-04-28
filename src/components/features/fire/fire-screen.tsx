"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { projectFire } from "@/lib/fire/projection";
import { formatMoney, toMinor } from "@/lib/money";

type Defaults = {
  net_worth_minor: number;
  annual_expenses_minor: number;
  base_currency: string;
};

export function FireScreen({ defaults }: { defaults: Defaults }) {
  const [netWorth, setNetWorth] = useState(
    formatNumber(defaults.net_worth_minor / 100),
  );
  const [annualExpenses, setAnnualExpenses] = useState(
    formatNumber(defaults.annual_expenses_minor / 100 || 60000),
  );
  const [monthlyContrib, setMonthlyContrib] = useState("3000");
  const [returnPct, setReturnPct] = useState("7");
  const [inflationPct, setInflationPct] = useState("6");
  const [adjustInflation, setAdjustInflation] = useState(true);
  const [currentAge, setCurrentAge] = useState("30");
  const [targetAge, setTargetAge] = useState("50");

  const result = useMemo(() => {
    const parse = (s: string) => parseFloat(s.replace(",", ".").replace(/\s/g, ""));
    const netWorthMinor = Number(toMinor(parse(netWorth) || 0, defaults.base_currency));
    const expensesMinor = Number(toMinor(parse(annualExpenses) || 0, defaults.base_currency));
    const monthlyMinor = Number(toMinor(parse(monthlyContrib) || 0, defaults.base_currency));

    return projectFire({
      net_worth_minor: netWorthMinor,
      annual_expenses_minor: expensesMinor,
      monthly_contribution_minor: monthlyMinor,
      expected_return: (parse(returnPct) || 7) / 100,
      inflation_rate: (parse(inflationPct) || 6) / 100,
      current_age: parseInt(currentAge, 10) || 30,
      target_age: parseInt(targetAge, 10) || 50,
      adjust_for_inflation: adjustInflation,
    });
  }, [
    netWorth,
    annualExpenses,
    monthlyContrib,
    returnPct,
    inflationPct,
    adjustInflation,
    currentAge,
    targetAge,
    defaults.base_currency,
  ]);

  const chartData = result.trajectory.map((t) => ({
    age: t.age,
    netWorth: t.net_worth_minor / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="glass-thin grid gap-4 rounded-(--radius-card) p-5 md:grid-cols-2">
        <FireField
          label="Patrimoniu curent"
          value={netWorth}
          onChange={setNetWorth}
          suffix={defaults.base_currency}
        />
        <FireField
          label="Cheltuieli anuale"
          value={annualExpenses}
          onChange={setAnnualExpenses}
          suffix={defaults.base_currency}
        />
        <FireField
          label="Contribuție lunară"
          value={monthlyContrib}
          onChange={setMonthlyContrib}
          suffix={defaults.base_currency}
        />
        <FireField
          label="Randament anual așteptat"
          value={returnPct}
          onChange={setReturnPct}
          suffix="%"
        />
        <FireField
          label="Inflație anuală RO"
          value={inflationPct}
          onChange={setInflationPct}
          suffix="%"
        />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-(--glass-border) px-3 py-2">
          <div>
            <Label className="text-sm font-medium">Ajustat la inflație</Label>
            <p className="text-muted-foreground text-xs">
              Real return = (1+r) / (1+i) − 1
            </p>
          </div>
          <Switch
            checked={adjustInflation}
            onCheckedChange={setAdjustInflation}
          />
        </div>
        <FireField
          label="Vârstă curentă"
          value={currentAge}
          onChange={setCurrentAge}
        />
        <FireField
          label="Target retire"
          value={targetAge}
          onChange={setTargetAge}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <FireCard
          title="Lean FIRE"
          subtitle="25× cheltuieli minimale"
          target={result.lean_target_minor}
          eta={result.lean_eta_year}
          years={result.years_to_lean}
          currency={defaults.base_currency}
          accent="blue"
        />
        <FireCard
          title="Coast FIRE"
          subtitle="Punct fără contribuții → Full la 65"
          target={result.coast_target_minor}
          eta={null}
          years={null}
          currency={defaults.base_currency}
          accent="yellow"
        />
        <FireCard
          title="Full FIRE"
          subtitle="25× cheltuieli curente"
          target={result.full_target_minor}
          eta={result.full_eta_year}
          years={result.years_to_full}
          currency={defaults.base_currency}
          accent="blue-bright"
        />
      </div>

      <div className="glass-thin rounded-(--radius-card) p-5">
        <h2 className="text-base font-semibold">Traiectorie net worth</h2>
        <p className="text-muted-foreground mt-0.5 mb-3 text-xs">
          Real return: {(result.effective_return * 100).toFixed(2)}% pe an ·
          horizon: {chartData.length} ani
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 10, fill: "currentColor" }}
                tickFormatter={(v) => `${v}`}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  typeof v === "number"
                    ? formatMoney(v * 100, defaults.base_currency)
                    : ""
                }
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return [formatMoney(n * 100, defaults.base_currency), "Net worth"];
                }}
                labelFormatter={(age) => `Vârsta ${age}`}
              />
              <ReferenceLine
                y={result.full_target_minor / 100}
                stroke="var(--accent-yellow)"
                strokeDasharray="4 4"
                label={{ value: "Full FIRE", position: "right", fontSize: 10 }}
              />
              <ReferenceLine
                y={result.lean_target_minor / 100}
                stroke="var(--accent-blue)"
                strokeDasharray="2 2"
                label={{ value: "Lean", position: "right", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="var(--accent-blue)"
                strokeWidth={2}
                fill="url(#fireGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toFixed(0);
}

function FireField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className={suffix ? "pr-14" : ""}
        />
        {suffix ? (
          <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FireCard({
  title,
  subtitle,
  target,
  eta,
  years,
  currency,
  accent,
}: {
  title: string;
  subtitle: string;
  target: number;
  eta: number | null;
  years: number | null;
  currency: string;
  accent: "blue" | "yellow" | "blue-bright";
}) {
  const accentClass =
    accent === "yellow"
      ? "text-(--accent-yellow)"
      : accent === "blue-bright"
        ? "text-(--accent-blue-bright)"
        : "text-(--accent-blue)";
  return (
    <div className="glass-thin rounded-(--radius-card) p-5">
      <p className={`text-xs font-bold uppercase tracking-wider ${accentClass}`}>
        {title}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
      <p className="num-hero mt-3 text-2xl font-semibold tracking-tight">
        {formatMoney(target, currency)}
      </p>
      <div className="mt-3 space-y-1 text-xs">
        {years !== null ? (
          <p>
            <span className="text-muted-foreground">În </span>
            <span className="font-semibold tabular-nums">
              {years.toFixed(1)} ani
            </span>
          </p>
        ) : null}
        {eta !== null ? (
          <p>
            <span className="text-muted-foreground">ETA </span>
            <span className="font-semibold tabular-nums">{eta}</span>
          </p>
        ) : null}
        {years === null && eta === null ? (
          <p className="text-muted-foreground">
            Nu se atinge cu rata curentă (60+ ani)
          </p>
        ) : null}
      </div>
    </div>
  );
}
