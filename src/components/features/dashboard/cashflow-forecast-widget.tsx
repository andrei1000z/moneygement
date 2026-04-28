"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { CashflowForecastChart } from "./cashflow-forecast-chart";

type Horizon = 30 | 60 | 90;
const ALLOWED: Horizon[] = [30, 60, 90];
const STORAGE_KEY = "banii.cashflow_horizon";

type Point = { date: string; projected_balance: number; upper: number; lower: number };
type LowPoint = { date: string; lower: number; projected_balance: number } | null;

type ForecastResponse = {
  points: Point[];
  currency: string;
  low: LowPoint;
  threshold: number;
  horizon: Horizon;
};

function readStoredHorizon(): Horizon {
  if (typeof window === "undefined") return 30;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? parseInt(raw, 10) : 30;
  return ALLOWED.includes(n as Horizon) ? (n as Horizon) : 30;
}

export function CashflowForecastWidget() {
  const [horizon, setHorizon] = useState<Horizon>(30);

  useEffect(() => {
    setHorizon(readStoredHorizon());
  }, []);

  const { data, isLoading } = useQuery<ForecastResponse>({
    queryKey: ["forecast", horizon],
    queryFn: async () => {
      const res = await fetch(`/api/forecast?horizon=${horizon}`);
      if (!res.ok) throw new Error("Forecast failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  function selectHorizon(h: Horizon) {
    setHorizon(h);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(h));
    }
  }

  if (isLoading) {
    return (
      <div className="glass-thin rounded-(--radius-card) p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-40 w-full" />
      </div>
    );
  }

  if (!data || data.points.length === 0) return null;

  const lowAlert =
    data.low && data.low.lower < data.threshold ? data.low : null;

  return (
    <div className="space-y-2">
      {lowAlert ? <LowBalanceBanner low={lowAlert} threshold={data.threshold} currency={data.currency} /> : null}
      <Link
        href="/insights"
        className="glass-thin specular block rounded-(--radius-card) p-4 transition-transform duration-200 hover:scale-[1.005]"
      >
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
            Forecast {horizon} zile
          </p>
          <HorizonSelector value={horizon} onChange={selectHorizon} />
        </div>
        <CashflowForecastChart
          data={data.points.map((p) => ({
            date: p.date,
            projected: p.projected_balance,
            upper: p.upper,
            lower: p.lower,
          }))}
          currency={data.currency}
        />
        {data.low && data.low.lower < 0 ? (
          <p className="text-amber-600 dark:text-amber-300 mt-2 text-xs">
            Pe {data.low.date}, soldul ar putea ajunge sub zero (interval inferior).
          </p>
        ) : null}
      </Link>
    </div>
  );
}

function HorizonSelector({
  value,
  onChange,
}: {
  value: Horizon;
  onChange: (h: Horizon) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Orizont forecast"
      className="glass-thin inline-flex items-center gap-0.5 rounded-(--radius-pill) p-0.5"
      onClick={(e) => e.preventDefault()}
    >
      {ALLOWED.map((h) => (
        <button
          key={h}
          type="button"
          role="radio"
          aria-checked={value === h}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onChange(h);
          }}
          className={cn(
            "rounded-(--radius-pill) px-2.5 py-0.5 text-[10px] font-semibold transition-colors",
            value === h
              ? "bg-(--accent-blue) text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {h}z
        </button>
      ))}
    </div>
  );
}

function LowBalanceBanner({
  low,
  threshold,
  currency,
}: {
  low: NonNullable<LowPoint>;
  threshold: number;
  currency: string;
}) {
  return (
    <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-3 rounded-(--radius-card) border p-3 text-sm">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <p className="flex-1">
        Sold sub <strong>{formatMoney(threshold, currency)}</strong> pe{" "}
        <strong>{low.date}</strong>. Verifică{" "}
        <Link
          href="/accounts"
          className="underline underline-offset-2 hover:no-underline"
        >
          conturile
        </Link>
        .
      </p>
    </div>
  );
}
