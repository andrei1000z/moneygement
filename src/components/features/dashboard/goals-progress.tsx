import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getDashboardContext } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

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
        className="border-border/60 bg-card hover:bg-accent/30 block rounded-xl border p-4 text-sm transition"
      >
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Obiective
        </p>
        <p className="mt-1">Setează un goal — vacanță, schimb auto…</p>
      </Link>
    );
  }

  return (
    <Link
      href="/goals"
      className="border-border/60 bg-card hover:bg-accent/30 block rounded-xl border p-4 transition"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-muted-foreground text-xs uppercase tracking-wider">
          Obiective
        </h3>
        <span className="text-muted-foreground text-xs">Vezi toate →</span>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {goals.map((g) => {
          const pct = g.target_amount > 0
            ? Math.min(1, g.current_amount / g.target_amount)
            : 0;
          const reached = g.current_amount >= g.target_amount;
          return (
            <li
              key={g.id}
              className="border-border/40 bg-background/40 flex items-center gap-3 rounded-lg border p-2.5"
            >
              <Ring pct={pct} reached={reached} />
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

function Ring({ pct, reached }: { pct: number; reached: boolean }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg viewBox="0 0 36 36" className="size-9 shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} strokeWidth={4} fill="none" className="stroke-muted" />
      <circle
        cx="18"
        cy="18"
        r={r}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className={cn(
          "transition-[stroke-dashoffset]",
          reached ? "stroke-emerald-500" : "stroke-primary",
        )}
      />
    </svg>
  );
}
