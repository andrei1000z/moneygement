// Detector lifestyle-inflation — rolling 12-luni YoY pe cheltuieli totale
// non-transfer non-recurring.
//
// Trigger: dacă YoY > 15% și income n-a crescut proporțional, oferă o
// reflecție caldă lunară.

export type InflationSignal = {
  current_window_total: number; // ultimele 12 luni
  prev_window_total: number; // cele 12 luni anterioare
  yoy_pct: number;
  income_yoy_pct: number;
  net_pct: number; // yoy_pct - income_yoy_pct
  alert: boolean;
};

type MonthlySpend = {
  month: string; // YYYY-MM
  expense_minor: number;
  income_minor: number;
};

/**
 * Calculează semnal lifestyle-inflation. Așteaptă cel puțin 24 luni
 * de date pentru un calcul valid.
 */
export function lifestyleInflation(
  monthly: MonthlySpend[],
): InflationSignal | null {
  if (monthly.length < 24) return null;

  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const latest12 = sorted.slice(-12);
  const prev12 = sorted.slice(-24, -12);

  const sumExp = (arr: MonthlySpend[]) =>
    arr.reduce((acc, m) => acc + m.expense_minor, 0);
  const sumInc = (arr: MonthlySpend[]) =>
    arr.reduce((acc, m) => acc + m.income_minor, 0);

  const curExp = sumExp(latest12);
  const prevExp = sumExp(prev12);
  const curInc = sumInc(latest12);
  const prevInc = sumInc(prev12);

  if (prevExp === 0) return null;
  const yoyPct = ((curExp - prevExp) / prevExp) * 100;
  const incomeYoyPct = prevInc === 0 ? 0 : ((curInc - prevInc) / prevInc) * 100;
  const netPct = yoyPct - incomeYoyPct;

  return {
    current_window_total: curExp,
    prev_window_total: prevExp,
    yoy_pct: yoyPct,
    income_yoy_pct: incomeYoyPct,
    net_pct: netPct,
    alert: yoyPct > 15 && netPct > 5,
  };
}
