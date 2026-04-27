import Link from "next/link";

import { CashflowForecastChart } from "./cashflow-forecast-chart";
import { forecastCashflow, findLowPoint } from "@/lib/forecast/cashflow";
import { createClient } from "@/lib/supabase/server";

/**
 * Widget pentru dashboard cu proiecție cashflow 30 zile.
 *
 * Inputs server-side:
 *   - balance curent al household-ului (sumă conturi non-arhivate, base
 *     currency aproximativ)
 *   - income_streams active cu next_expected_on și cadență
 *   - tranzacții ultimele 90 zile pentru baseline discreționar
 */
export async function CashflowForecastWidget() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_household")
    .eq("id", user.id)
    .single();
  if (!profile?.active_household) return null;

  // Sold curent (sumă conturi non-arhivate, în moneda primului cont).
  const { data: accounts } = await supabase
    .from("accounts")
    .select("currency, current_balance")
    .eq("household_id", profile.active_household)
    .is("archived_at", null);
  if (!accounts || accounts.length === 0) return null;

  const currency = accounts[0]?.currency ?? "RON";
  const startingBalance = accounts
    .filter((a) => a.currency === currency)
    .reduce((acc, a) => acc + Number(a.current_balance ?? 0), 0);

  // Income streams active.
  const { data: streams } = await supabase
    .from("income_streams")
    .select("expected_amount, expected_currency, next_expected_on, cadence_days, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("next_expected_on", "is", null);

  // Tranzacții ultimele 90 zile pentru baseline discreționar.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  const fromIso = ninetyDaysAgo.toISOString().slice(0, 10);

  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, currency, occurred_on, is_transfer")
    .eq("household_id", profile.active_household)
    .eq("is_transfer", false)
    .gte("occurred_on", fromIso)
    .lt("amount", 0)
    .eq("currency", currency);

  const totalDiscretionary = (txs ?? []).reduce(
    (acc, t) => acc + Number(t.amount),
    0,
  );
  const dailyDiscretionary = Math.round(totalDiscretionary / 90); // negativ

  // Recurring transactions (next_date în orizont).
  const { data: recurring } = await supabase
    .from("recurring_transactions")
    .select("payee, amount, currency, next_date, frequency")
    .eq("household_id", profile.active_household)
    .eq("is_active", true)
    .eq("currency", currency);

  const cadenceForFreq: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 91,
    yearly: 365,
  };

  const points = forecastCashflow({
    starting_balance: startingBalance,
    daily_discretionary: dailyDiscretionary,
    recurring: (recurring ?? []).map((r) => ({
      next_due: r.next_date,
      amount: Number(r.amount),
      label: r.payee ?? "Recurent",
      cadence_days: cadenceForFreq[r.frequency ?? "monthly"] ?? 30,
    })),
    income_streams: (streams ?? [])
      .filter((s) => s.expected_currency === currency)
      .map((s) => ({
        next_due: s.next_expected_on!,
        amount: Number(s.expected_amount),
        cadence_days: s.cadence_days,
        label: s.name,
      })),
    horizon_days: 30,
  });

  const low = findLowPoint(points);

  return (
    <Link
      href="/insights"
      className="glass-thin specular block rounded-(--radius-card) p-4 transition-transform duration-200 hover:scale-[1.005]"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.15em]">
          Forecast 30 zile
        </p>
        <p className="text-muted-foreground text-[11px]">
          ±15% confidence
        </p>
      </div>
      <CashflowForecastChart
        data={points.map((p) => ({
          date: p.date,
          projected: p.projected_balance,
          upper: p.upper,
          lower: p.lower,
        }))}
        currency={currency}
      />
      {low && low.lower < 0 ? (
        <p className="text-amber-600 dark:text-amber-300 mt-2 text-xs">
          Atenție: pe {low.date}, soldul ar putea ajunge sub zero (interval
          inferior).
        </p>
      ) : null}
    </Link>
  );
}
