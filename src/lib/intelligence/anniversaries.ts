// "Acum un an, X la Y — Z lei". Pentru o dată curentă, găsește tranzacțiile
// care au avut loc fix cu un an în urmă (±1 zi). Folosit într-un widget
// "În aceeași zi acum un an".

export type Anniversary = {
  occurred_on: string;
  amount: number;
  currency: string;
  payee: string | null;
  category_id: string | null;
};

type Tx = {
  occurred_on: string;
  amount: number;
  currency: string;
  payee: string | null;
  category_id: string | null;
  is_transfer: boolean;
};

export function anniversariesForDate(
  txs: Tx[],
  date: Date = new Date(),
): Anniversary[] {
  const oneYearAgo = new Date(date);
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  const target = oneYearAgo.toISOString().slice(0, 10);
  const targetMinusOne = new Date(oneYearAgo);
  targetMinusOne.setUTCDate(targetMinusOne.getUTCDate() - 1);
  const targetPlusOne = new Date(oneYearAgo);
  targetPlusOne.setUTCDate(targetPlusOne.getUTCDate() + 1);
  const range = new Set([
    targetMinusOne.toISOString().slice(0, 10),
    target,
    targetPlusOne.toISOString().slice(0, 10),
  ]);

  return txs
    .filter((t) => !t.is_transfer && range.has(t.occurred_on))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 3)
    .map((t) => ({
      occurred_on: t.occurred_on,
      amount: t.amount,
      currency: t.currency,
      payee: t.payee,
      category_id: t.category_id,
    }));
}
