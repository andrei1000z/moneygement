import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getDashboardContext } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

export async function GoalsProgress() {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("id, name, target_amount, current_amount, currency, target_date")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!goals || goals.length === 0) {
    return (
      <Link
        href="/goals"
        className="glass-thin specular block rounded-(--radius-card) p-4 text-sm transition-transform duration-200 hover:scale-[1.005]"
      >
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Obiective
        </p>
        <p className="mt-1">Setează un goal — vacanță, schimb auto…</p>
      </Link>
    );
  }

  return (
    <Link
      href="/goals"
      className="glass-thin specular block rounded-(--radius-card) p-4 transition-transform duration-200 hover:scale-[1.005]"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Obiective
        </h3>
        <span className="text-muted-foreground text-xs">Vezi toate →</span>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {goals.map((g) => {
          const pct =
            g.target_amount > 0
              ? Math.min(1, g.current_amount / g.target_amount)
              : 0;
          const reached = g.current_amount >= g.target_amount;
          return (
            <li
              key={g.id}
              className="flex items-center gap-3 rounded-xl border border-(--glass-border) bg-(--surface-tint-faint) p-2.5"
            >
              <Ring pct={pct} reached={reached} keySuffix={g.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{g.name}</p>
                <p className="text-muted-foreground tabular-nums text-[11px]">
                  {formatMoney(g.current_amount, g.currency)} /{" "}
                  {formatMoney(g.target_amount, g.currency)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Link>
  );
}

/**
 * Progress ring cu gradient stroke aurora (cyan → violet → emerald) și
 * glow drop-shadow. Pe reached, gradient solid emerald cu glow puternic.
 */
function Ring({
  pct,
  reached,
  keySuffix,
}: {
  pct: number;
  reached: boolean;
  keySuffix: string;
}) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const gradId = `goal-grad-${keySuffix}`;
  const glowId = `goal-glow-${keySuffix}`;
  return (
    <svg viewBox="0 0 36 36" className="size-9 shrink-0 -rotate-90">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop
            offset="0%"
            stopColor={reached ? "var(--accent-blue)" : "var(--accent-blue-bright)"}
          />
          <stop
            offset="50%"
            stopColor={reached ? "var(--accent-blue)" : "var(--accent-yellow)"}
          />
          <stop
            offset="100%"
            stopColor="var(--accent-blue)"
          />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="18"
        cy="18"
        r={r}
        strokeWidth={4}
        fill="none"
        stroke="color-mix(in oklch, var(--foreground), transparent 88%)"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        stroke={`url(#${gradId})`}
        filter={`url(#${glowId})`}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}
