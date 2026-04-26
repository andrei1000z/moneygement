import "server-only";

// Subscription detector — median-gap algorithm.
//
// Algoritm (Plaid + Subaio inspirate):
//   1. Grupare tranzacții pe (payee_normalized, currency)
//   2. Sortare după dată
//   3. Pentru fiecare grup cu ≥3 ocurențe:
//      - Calculează gaps în zile între tranzacții consecutive
//      - Mediana gap-urilor → cadență
//      - Variance coeficient = stdev/mean al gap-urilor
//      - Variance amount = stdev/mean al sumelor
//   4. Acceptăm ca subscription dacă:
//      - cadence_variance < 0.15 (gap-uri stabile)
//      - amount_variance < 0.05 (sume stabile ±5%)
//      - cadența recunoscută (weekly/biweekly/monthly/quarterly/yearly)
//   5. Detect price-hike: ultimele 3 sume > median(precedentele 3) cu >5%

export type DetectedSubscription = {
  payee_normalized: string;
  payee_display: string;
  currency: string;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  median_amount: number; // minor units, absolut
  occurrences_count: number;
  first_seen: string;
  last_seen: string;
  price_hike_pct: number | null;
};

type TxRow = {
  payee: string | null;
  notes: string | null;
  amount: number;
  currency: string;
  occurred_on: string;
};

function normalizePayee(payee: string | null, notes: string | null): string {
  const raw = (payee ?? notes ?? "").toLowerCase();
  return raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function classifyCadence(
  medianGapDays: number,
): DetectedSubscription["cadence"] | null {
  if (medianGapDays >= 6 && medianGapDays <= 8) return "weekly";
  if (medianGapDays >= 13 && medianGapDays <= 16) return "biweekly";
  if (medianGapDays >= 26 && medianGapDays <= 35) return "monthly";
  if (medianGapDays >= 85 && medianGapDays <= 95) return "quarterly";
  if (medianGapDays >= 360 && medianGapDays <= 370) return "yearly";
  return null;
}

export function detectSubscriptions(
  txs: TxRow[],
): DetectedSubscription[] {
  // Doar cheltuieli (negative).
  const expenses = txs.filter((t) => t.amount < 0);

  // Grupare pe (normalized payee, currency).
  const groups = new Map<string, TxRow[]>();
  for (const tx of expenses) {
    const norm = normalizePayee(tx.payee, tx.notes);
    if (!norm || norm.length < 2) continue;
    const key = `${norm}|${tx.currency}`;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const out: DetectedSubscription[] = [];
  for (const [, txs] of groups) {
    if (txs.length < 3) continue;

    txs.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    const dates = txs.map((t) => Date.parse(t.occurred_on));
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const days = (dates[i]! - dates[i - 1]!) / (1000 * 60 * 60 * 24);
      gaps.push(days);
    }
    if (gaps.length === 0) continue;

    const medianGap = median(gaps);
    const cadence = classifyCadence(medianGap);
    if (!cadence) continue;

    const cadenceVariance =
      mean(gaps) === 0 ? 1 : stdev(gaps) / mean(gaps);
    if (cadenceVariance > 0.15) continue;

    const amounts = txs.map((t) => Math.abs(t.amount));
    const meanAmount = mean(amounts);
    const amountVariance = meanAmount === 0 ? 1 : stdev(amounts) / meanAmount;
    if (amountVariance > 0.08) continue; // permitem ±8% pentru micile fluctuații FX

    const medianAmount = Math.round(median(amounts));

    // Price-hike: comparăm ultimele 3 cu prelevarea anterioară.
    let priceHikePct: number | null = null;
    if (amounts.length >= 6) {
      const recent3 = amounts.slice(-3);
      const earlier = amounts.slice(0, -3);
      const earlierMedian = median(earlier);
      const recent3Median = median(recent3);
      if (earlierMedian > 0) {
        const pct = ((recent3Median - earlierMedian) / earlierMedian) * 100;
        if (pct > 5) priceHikePct = pct;
      }
    }

    out.push({
      payee_normalized: normalizePayee(txs[0]!.payee, txs[0]!.notes),
      payee_display:
        txs[txs.length - 1]!.payee ??
        txs[txs.length - 1]!.notes?.slice(0, 60) ??
        "—",
      currency: txs[0]!.currency,
      cadence,
      median_amount: medianAmount,
      occurrences_count: txs.length,
      first_seen: txs[0]!.occurred_on,
      last_seen: txs[txs.length - 1]!.occurred_on,
      price_hike_pct: priceHikePct,
    });
  }

  return out.sort((a, b) => b.median_amount - a.median_amount);
}
