import "server-only";

// Forecast 30/60/90 zile pentru cashflow.
//
// Inputs:
//   - tranzacții ultimele 6 luni (pentru baseline discreționar)
//   - recurring_transactions (next_due_at + amount + cadență)
//   - income streams (salarii lunare etc — pentru moment median al
//     income-urilor pozitive ne-transfer)
//
// Output: serie zilnică cu balance proiectat + confidence band ±15% și
// puncte cu alert de balanță sub un threshold dat.

export type CashflowPoint = {
  date: string; // YYYY-MM-DD
  projected_balance: number; // base currency, minor units
  upper: number;
  lower: number;
  events: Array<{ kind: "recurring" | "income" | "discretionary"; amount: number; label?: string }>;
};

export type ForecastInput = {
  starting_balance: number; // base currency, minor units
  /** Tranzacții recurente cu next_due_at în orizont. */
  recurring: Array<{
    next_due: string; // YYYY-MM-DD
    amount: number; // semnat, minor units
    label: string;
    cadence_days: number;
  }>;
  /** Cheltuieli discreționare medii pe zi (din ultimele 90 zile non-transfer non-recurring). */
  daily_discretionary: number; // negativ
  /** Income streams certe (salariu lunar etc). */
  income_streams: Array<{
    next_due: string;
    amount: number; // pozitiv, minor units
    cadence_days: number; // 30 pentru lunar
    label: string;
  }>;
  horizon_days: 30 | 60 | 90;
  low_balance_threshold?: number; // minor units; default 0
};

/**
 * Generează forecast-ul cu confidence band ±15% pe componenta discreționară.
 * Recurring + income sunt "certe" (band se aplică doar pe partea de
 * cheltuieli discreționare).
 */
export function forecastCashflow(input: ForecastInput): CashflowPoint[] {
  const out: CashflowPoint[] = [];
  let balance = input.starting_balance;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let d = 0; d < input.horizon_days; d++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + d);
    const iso = day.toISOString().slice(0, 10);
    const events: CashflowPoint["events"] = [];

    // 1) Recurring care cad astăzi (sau au căzut într-o zi anterioară a
    //    forecastului în care nu am proiectat încă, dar simplificăm:
    //    iterăm strict pe match-uri exacte cu ziua curentă plus ciclurile).
    for (const r of input.recurring) {
      const match = matchesCadence(iso, r.next_due, r.cadence_days);
      if (match) {
        balance += r.amount;
        events.push({ kind: "recurring", amount: r.amount, label: r.label });
      }
    }

    // 2) Income streams.
    for (const s of input.income_streams) {
      if (matchesCadence(iso, s.next_due, s.cadence_days)) {
        balance += s.amount;
        events.push({ kind: "income", amount: s.amount, label: s.label });
      }
    }

    // 3) Discretionary baseline.
    balance += input.daily_discretionary;
    events.push({
      kind: "discretionary",
      amount: input.daily_discretionary,
    });

    // Confidence band ±15% pe componenta discreționară cumulată.
    const cumulativeDiscretionary = (d + 1) * input.daily_discretionary;
    const bandWidth = Math.abs(cumulativeDiscretionary) * 0.15;

    out.push({
      date: iso,
      projected_balance: Math.round(balance),
      upper: Math.round(balance + bandWidth),
      lower: Math.round(balance - bandWidth),
      events,
    });
  }

  return out;
}

function matchesCadence(
  isoDate: string,
  startIso: string,
  cadenceDays: number,
): boolean {
  if (cadenceDays <= 0) return false;
  const a = Date.parse(isoDate);
  const b = Date.parse(startIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a < b) return false;
  const diff = Math.round((a - b) / 86400000);
  return diff % cadenceDays === 0;
}

/**
 * Punctul cel mai jos al forecast-ului — folosit pentru alert.
 */
export function findLowPoint(points: CashflowPoint[]): CashflowPoint | null {
  if (points.length === 0) return null;
  let lowest = points[0]!;
  for (const p of points) {
    if (p.lower < lowest.lower) lowest = p;
  }
  return lowest;
}
