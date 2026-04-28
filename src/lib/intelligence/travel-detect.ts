/**
 * travel-detect.ts — euristic pentru detectare clustere de tranzacții
 * care par a fi într-o țară străină.
 *
 * Reguli (heuristic, fără ML):
 *   1. ≥2 zile consecutive cu tranzacții POS
 *   2. Tranzacțiile au cel puțin una din:
 *      a) currency != base_currency
 *      b) payee match cu pattern non-RO (latină extinsă inafara română)
 *      c) MCC străin în notes
 *
 * Output: TripCandidate[] cu name + interval + country hint.
 */

export type DetectorTx = {
  payee: string | null;
  notes: string | null;
  currency: string;
  occurred_on: string;
  amount: number;
};

export type TripCandidate = {
  name: string;
  started_on: string;
  ended_on: string;
  country_hint: string | null;
  tx_count: number;
  total_minor: number;
  primary_currency: string;
};

const RO_LATIN_REGEX = /^[A-Za-z0-9\s.,&\-_/'șȘțȚăĂâÂîÎ]+$/;
const FOREIGN_HINTS: Array<[RegExp, string]> = [
  [/\b(athens|greec|hellas|grecia|santorini|mykonos|crete)\b/i, "GR"],
  [/\b(roma|milano|firenze|venezia|italia|italy)\b/i, "IT"],
  [/\b(madrid|barcelona|spain|spania|sevilla|valencia)\b/i, "ES"],
  [/\b(paris|france|franta|nice|lyon|marseille)\b/i, "FR"],
  [/\b(berlin|deutschland|germany|german|munchen|hamburg)\b/i, "DE"],
  [/\b(london|england|uk|britain)\b/i, "GB"],
  [/\b(amsterdam|netherlands|holland)\b/i, "NL"],
  [/\b(istanbul|turkey|turcia|antalya|izmir)\b/i, "TR"],
  [/\b(viena|vienna|austria|salzburg|innsbruck)\b/i, "AT"],
  [/\b(prague|czech|cesko|praha)\b/i, "CZ"],
  [/\b(budapest|hungary|ungaria)\b/i, "HU"],
];

function detectCountry(payee: string | null, notes: string | null): string | null {
  const blob = `${payee ?? ""} ${notes ?? ""}`.toLowerCase();
  for (const [re, code] of FOREIGN_HINTS) {
    if (re.test(blob)) return code;
  }
  return null;
}

function looksForeign(tx: DetectorTx, baseCurrency: string): boolean {
  if (tx.currency !== baseCurrency) return true;
  const country = detectCountry(tx.payee, tx.notes);
  if (country) return true;
  // Caractere non-RO (rusă, greacă, slavonă) în payee
  if (tx.payee && !RO_LATIN_REGEX.test(tx.payee)) return true;
  return false;
}

export function detectTravelClusters(
  txs: DetectorTx[],
  baseCurrency: string = "RON",
): TripCandidate[] {
  const sorted = [...txs].sort((a, b) =>
    a.occurred_on.localeCompare(b.occurred_on),
  );

  const foreign = sorted.filter((t) => looksForeign(t, baseCurrency));
  if (foreign.length < 3) return [];

  // Group by consecutive days with foreign tx.
  const clusters: DetectorTx[][] = [];
  let current: DetectorTx[] = [];
  let lastDate: Date | null = null;

  for (const tx of foreign) {
    const d = new Date(tx.occurred_on);
    if (
      lastDate &&
      Math.abs(d.getTime() - lastDate.getTime()) > 3 * 24 * 60 * 60 * 1000
    ) {
      // Gap mai mare de 3 zile între foreign tx → cluster nou.
      if (current.length >= 3) clusters.push(current);
      current = [];
    }
    current.push(tx);
    lastDate = d;
  }
  if (current.length >= 3) clusters.push(current);

  return clusters
    .map((group) => {
      const country = group
        .map((t) => detectCountry(t.payee, t.notes))
        .find((c) => c !== null) ?? null;
      const currencies = new Map<string, number>();
      let total = 0;
      for (const t of group) {
        currencies.set(t.currency, (currencies.get(t.currency) ?? 0) + 1);
        total += Math.abs(t.amount);
      }
      const primary =
        Array.from(currencies.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        baseCurrency;
      const startedOn = group[0]!.occurred_on;
      const endedOn = group[group.length - 1]!.occurred_on;
      const year = startedOn.slice(0, 4);
      const name = country
        ? `${countryName(country)} ${year}`
        : `Călătorie ${year}`;
      return {
        name,
        started_on: startedOn,
        ended_on: endedOn,
        country_hint: country,
        tx_count: group.length,
        total_minor: total,
        primary_currency: primary,
      } satisfies TripCandidate;
    })
    .filter((c) => c.tx_count >= 3);
}

function countryName(code: string): string {
  const map: Record<string, string> = {
    GR: "Grecia",
    IT: "Italia",
    ES: "Spania",
    FR: "Franța",
    DE: "Germania",
    GB: "Marea Britanie",
    NL: "Olanda",
    TR: "Turcia",
    AT: "Austria",
    CZ: "Cehia",
    HU: "Ungaria",
  };
  return map[code] ?? code;
}
