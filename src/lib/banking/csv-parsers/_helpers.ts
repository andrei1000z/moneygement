// Helperi partajați între parserii CSV.

import Papa from "papaparse";

/**
 * Hash determinist FNV-1a 32-bit pentru external_id de fallback. Returnează
 * hex pe 8 caractere. Nu e crypto — doar dedup + collision-resistance OK
 * pentru câteva mii de tranzacții.
 */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Construiește un external_id stabil din (date, amount, description).
 * Mai sigur decât rowIndex pentru că nu se schimbă la re-import al aceluiași
 * extras.
 */
export function makeExternalId(
  bank: string,
  date: string,
  amountMinor: bigint,
  description: string,
): string {
  const key = `${bank}|${date}|${amountMinor}|${description.replace(/\s+/g, " ").trim()}`;
  return `${bank}-${fnv1a(key)}`;
}

/**
 * Parsează un decimal românesc/european:
 *   "1.234,56" → 1234.56
 *   "1234.56"  → 1234.56
 *   "-1.234,56 RON" → -1234.56
 *   "(1234.56)" → -1234.56  (paranteze = negativ în extras unele bănci)
 */
export function parseDecimal(s: string): number | null {
  if (!s) return null;
  let raw = String(s).trim();
  if (!raw) return null;

  // Paranteze = negativ
  const negativeFromParens = /^\(.*\)$/.test(raw);
  if (negativeFromParens) raw = raw.slice(1, -1).trim();

  // Elimină simboluri valutare și litere comune (RON, EUR, Lei).
  raw = raw.replace(/[A-Za-z]+\.?\s*$/g, "").trim();
  raw = raw.replace(/^\+/, "").trim();

  // Determină separator decimal: ultima virgulă vs ultim punct.
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;
  if (lastComma > lastDot) {
    // Virgula e separator decimal. Punctul (thousand) → eliminat.
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = raw.replace(/,/g, "");
  } else {
    normalized = raw;
  }

  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return negativeFromParens ? -Math.abs(num) : num;
}

/**
 * Convertește un decimal la unități minore (bani pentru RON, cents pentru EUR).
 * Folosește banker's rounding (round-half-to-even) pentru consistență cu money.ts.
 */
export function toMinorUnits(value: number, _currency: string): bigint {
  void _currency;
  // Toate monedele suportate în Banii folosesc 2 zecimale.
  const cents = Math.round(value * 100);
  return BigInt(cents);
}

const RO_MONTHS: Record<string, number> = {
  ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6,
  iul: 7, aug: 8, sep: 9, oct: 10, noi: 11, dec: 12,
};

/**
 * Parsează o dată în formate uzuale româneşti:
 *   - 2026-04-25
 *   - 25.04.2026
 *   - 25/04/2026
 *   - 25-04-2026
 *   - 25 Apr 2026 / 25 apr. 2026
 */
export function parseDate(s: string): string | null {
  if (!s) return null;
  const t = String(s).trim();

  // ISO complet
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }

  // dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy
  const dmy = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (dmy) {
    const [, d, m, yRaw] = dmy;
    let y = yRaw!;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }

  // dd MMM yyyy (română prescurtată)
  const named = t.match(/^(\d{1,2})\s+([A-Za-zăâîșț.]{3,})\s+(\d{4})/i);
  if (named) {
    const [, d, monRaw, y] = named;
    const mon = monRaw!.toLowerCase().replace(/\.|ie$/g, "").slice(0, 3);
    const m = RO_MONTHS[mon];
    if (m) {
      return `${y}-${String(m).padStart(2, "0")}-${d!.padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Auto-detectează delimiter (virgulă/punct și virgulă/tab) și parsează cu Papa.
 * Întoarce header și rânduri ca string[][].
 */
export function parseCsv(csv: string): {
  headers: string[];
  rows: string[][];
} {
  // Detectează delimiter pe primele 10 linii — Papa îl detectează automat
  // dacă îi dăm undefined.
  const result = Papa.parse<string[]>(csv.replace(/^﻿/, ""), {
    delimiter: "",
    skipEmptyLines: true,
    header: false,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0 && result.errors[0]?.code !== "TooFewFields") {
    // Continuăm cu ce avem — erori parțiale sunt OK pentru csv-uri cu rânduri stricate.
  }

  const data = (result.data ?? []) as string[][];
  if (data.length === 0) return { headers: [], rows: [] };

  const headers = (data[0] ?? []).map((h) => String(h ?? "").trim());
  const rows = data.slice(1);
  return { headers, rows };
}

/**
 * Caută indexul header-ului care match-uie oricare din pattern-urile date
 * (case-insensitive, accent-insensitive).
 */
export function findColumn(
  headers: string[],
  patterns: (string | RegExp)[],
): number {
  const norm = headers.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim(),
  );
  for (let i = 0; i < norm.length; i++) {
    const h = norm[i]!;
    for (const p of patterns) {
      if (typeof p === "string") {
        const np = p
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        if (h === np || h.includes(np)) return i;
      } else if (p.test(h)) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Match între header-ul CSV-ului și un set canonic de denumiri. Folosit la
 * detecție.
 */
export function hasAnyHeader(
  headers: string[],
  patterns: (string | RegExp)[],
): boolean {
  return findColumn(headers, patterns) !== -1;
}
