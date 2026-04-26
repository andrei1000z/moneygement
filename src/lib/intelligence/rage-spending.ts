// Detector "rage spending" — ≥3 tranzacții în <30min în aceeași categorie.
//
// Output non-judgmental, cu opțiune de toggle în settings (UI).

export type RageSession = {
  category_id: string;
  start: string; // ISO datetime
  end: string;
  count: number;
  total_minor: number;
  currency: string;
};

type Tx = {
  category_id: string | null;
  amount: number; // signed minor
  currency: string;
  /** Stocăm `posted_at` sau fallback la `occurred_on` cu timpul 12:00. */
  occurred_at: string;
};

const WINDOW_MS = 30 * 60 * 1000;
const MIN_TX = 3;

export function detectRageSessions(txs: Tx[]): RageSession[] {
  // Grupare pe categorie.
  const byCat = new Map<string, Tx[]>();
  for (const tx of txs) {
    if (!tx.category_id || tx.amount >= 0) continue;
    const arr = byCat.get(tx.category_id) ?? [];
    arr.push(tx);
    byCat.set(tx.category_id, arr);
  }

  const out: RageSession[] = [];
  for (const [catId, items] of byCat) {
    items.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    let i = 0;
    while (i < items.length) {
      const startTx = items[i]!;
      const start = Date.parse(startTx.occurred_at);
      if (!Number.isFinite(start)) {
        i++;
        continue;
      }
      let j = i;
      let total = 0;
      while (
        j < items.length &&
        Date.parse(items[j]!.occurred_at) - start <= WINDOW_MS
      ) {
        total += Math.abs(items[j]!.amount);
        j++;
      }
      const count = j - i;
      if (count >= MIN_TX) {
        out.push({
          category_id: catId,
          start: startTx.occurred_at,
          end: items[j - 1]!.occurred_at,
          count,
          total_minor: total,
          currency: startTx.currency,
        });
        i = j; // skip toate, evităm dublări
      } else {
        i++;
      }
    }
  }

  return out.sort((a, b) => b.total_minor - a.total_minor);
}
