// Salary detection — identifică surse de venit recurente din istoric.
//
// Algoritm:
//   1. Filtrează tranzacțiile pozitive non-transfer din ultimele 12 luni
//   2. Grupează pe (payer normalizat, currency)
//   3. Pentru fiecare grup ≥3 ocurențe:
//      - Calculează gap-uri în zile între tranzacții consecutive
//      - Median gap → cadență (lunar dacă 28-32, etc.)
//      - Variance amount < 10% (acceptăm fluctuații din bonusuri ușoare)
//      - Day-of-month median (pentru countdown widget)
//   4. Detect special: pensia română Casa Națională de Pensii — descrieri
//      „PENSIE", „CASA NATIONALA DE PENSII"
//
// Confidence score: max 1.0 cu n_occurrences/12 plus stabilitate cadență.

export type DetectedIncome = {
  payer: string;
  name: string;
  expected_amount: number; // minor units, mediană
  currency: string;
  expected_day_of_month: number; // 1..31
  cadence_days: number;
  day_variance: number;
  confidence: number; // 0..1
  occurrences_count: number;
  first_seen: string;
  last_seen: string;
};

type IncomeTx = {
  payee: string | null;
  notes: string | null;
  amount: number; // pozitiv pentru income
  currency: string;
  occurred_on: string;
};

const PENSION_PATTERNS = [
  /casa\s+nationala\s+de\s+pensii/i,
  /\bpensie\b/i,
  /posta\s+romana/i,
];

function normalizePayer(payee: string | null, notes: string | null): string {
  const raw = (payee ?? notes ?? "").toLowerCase();
  // Specială: pensia.
  if (PENSION_PATTERNS.some((re) => re.test(raw))) {
    return "casa nationala de pensii";
  }
  return raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(
    arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - 1),
  );
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function dayOfMonth(iso: string): number {
  return new Date(iso).getUTCDate();
}

function isLikelySalary(amounts: number[]): boolean {
  // Filtrăm sume mici (<1000 RON / ~200 EUR equiv) — probabil refunds /
  // transferuri mici, nu salariu.
  const med = median(amounts);
  return med >= 100_000;
}

export function detectIncomeStreams(txs: IncomeTx[]): DetectedIncome[] {
  const incomes = txs.filter((t) => t.amount > 0);
  const groups = new Map<string, IncomeTx[]>();
  for (const tx of incomes) {
    const key = `${normalizePayer(tx.payee, tx.notes)}|${tx.currency}`;
    if (!key.split("|")[0]) continue;
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  const out: DetectedIncome[] = [];
  for (const [key, items] of groups) {
    if (items.length < 3) continue;
    items.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));

    const amounts = items.map((t) => t.amount);
    if (!isLikelySalary(amounts)) continue;

    const meanAmount = mean(amounts);
    const amountVariance = meanAmount === 0 ? 1 : stdev(amounts) / meanAmount;
    if (amountVariance > 0.1) continue;

    const gaps: number[] = [];
    for (let i = 1; i < items.length; i++) {
      gaps.push(diffDays(items[i - 1]!.occurred_on, items[i]!.occurred_on));
    }
    const medianGap = median(gaps);
    if (medianGap < 6 || medianGap > 35) continue;

    const dayMedian = Math.round(
      median(items.map((t) => dayOfMonth(t.occurred_on))),
    );
    const dayStdev = Math.round(
      stdev(items.map((t) => dayOfMonth(t.occurred_on))),
    );

    const cadenceVariance = mean(gaps) === 0 ? 1 : stdev(gaps) / mean(gaps);
    const cadenceStability = Math.max(0, 1 - cadenceVariance / 0.2);
    const occurrenceFactor = Math.min(1, items.length / 12);
    const confidence = Number((cadenceStability * occurrenceFactor).toFixed(2));

    const payer = key.split("|")[0]!;
    const isPension = /casa nationala/i.test(payer);

    out.push({
      payer,
      name: isPension ? "Pensie" : "Salariu",
      expected_amount: Math.round(median(amounts)),
      currency: items[0]!.currency,
      expected_day_of_month: dayMedian,
      cadence_days: Math.round(medianGap),
      day_variance: dayStdev,
      confidence,
      occurrences_count: items.length,
      first_seen: items[0]!.occurred_on,
      last_seen: items[items.length - 1]!.occurred_on,
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculează data următoarei plăți așteptate, pe baza dayOfMonth + cadență.
 */
export function nextExpected(
  todayIso: string,
  lastSeenIso: string,
  cadenceDays: number,
): string {
  const last = new Date(lastSeenIso);
  const next = new Date(last);
  next.setUTCDate(next.getUTCDate() + cadenceDays);
  while (next.toISOString().slice(0, 10) <= todayIso) {
    next.setUTCDate(next.getUTCDate() + cadenceDays);
  }
  return next.toISOString().slice(0, 10);
}
