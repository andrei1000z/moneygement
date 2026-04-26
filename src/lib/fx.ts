// Foreign exchange utilities — BNR primary, Frankfurter fallback.
// Constants și formatRate sunt isomorphic; functions de fetch (`fetchBnr*`,
// `fetchFrankfurter*`) folosesc fetch global și nu țin chei secrete, dar
// ar trebui apelate doar din server (route handlers, edge functions).
//
// Format BNR (`nbrfxrates.xml`):
//   <Body>
//     <Cube date="2026-04-25">
//       <Rate currency="EUR">4.9785</Rate>
//       <Rate currency="USD" multiplier="1">4.4231</Rate>
//       <Rate currency="HUF" multiplier="100">1.2345</Rate>
//     </Cube>
//   </Body>
//
// Notă: rate-ul e EXPRIMAT în RON pentru 1 unitate (sau N unități dacă
// `multiplier` e prezent — întotdeauna 100 pentru HUF/JPY/KRW).
// Stocăm normalizat ca rate per 1 unitate (rate / multiplier).

import { XMLParser } from "fast-xml-parser";

export const BNR_DAILY_URL = "https://www.bnr.ro/nbrfxrates.xml" as const;
export const BNR_TEN_DAYS_URL =
  "https://www.bnr.ro/nbrfxrates10days.xml" as const;
export const BNR_HISTORICAL_URL = (year: number) =>
  `https://www.bnr.ro/files/xml/years/nbrfxrates${year}.xml` as const;
export const FRANKFURTER_BASE_URL = "https://api.frankfurter.app" as const;

/** Monede pe care le sincronizăm. RON e baza, deci nu apare. */
export const TRACKED_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "HUF"] as const;

export type TrackedCurrency = (typeof TRACKED_CURRENCIES)[number];

export type FxRate = {
  rate_date: string; // YYYY-MM-DD
  base: string;      // ex.: 'EUR'
  quote: string;     // ex.: 'RON'
  rate: number;      // 1 unitate `base` = `rate` unități `quote`
  source: "BNR" | "Frankfurter" | "manual" | "historical";
};

// ---------------------------------------------------------------- BNR XML

type BnrRateXml = {
  "#text": number;
  "@_currency": string;
  "@_multiplier"?: number;
};

type BnrParsed = {
  DataSet?: {
    Body?: {
      Cube?:
        | {
            "@_date": string;
            Rate?: BnrRateXml | BnrRateXml[];
          }
        | Array<{
            "@_date": string;
            Rate?: BnrRateXml | BnrRateXml[];
          }>;
    };
  };
};

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Parsează un XML BNR (zilnic sau istoric). Întoarce un array de rate
 * normalizate (1 unitate `base` = `rate` RON).
 */
export function parseBnrXml(xml: string): FxRate[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    parseTagValue: true,
  });

  const parsed = parser.parse(xml) as BnrParsed;
  const cubes = asArray(parsed.DataSet?.Body?.Cube);
  const out: FxRate[] = [];

  for (const cube of cubes) {
    const date = String(cube["@_date"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    for (const rate of asArray(cube.Rate)) {
      const currency = String(rate["@_currency"] ?? "").toUpperCase();
      if (!currency) continue;
      const multiplier = Number(rate["@_multiplier"] ?? 1) || 1;
      const value = Number(rate["#text"]);
      if (!Number.isFinite(value) || value <= 0) continue;

      out.push({
        rate_date: date,
        base: currency,
        quote: "RON",
        rate: value / multiplier,
        source: "BNR",
      });
    }
  }

  return out;
}

/**
 * Fetch BNR daily rates. Aruncă dacă HTTP nu e 2xx; apelantul decide
 * fallback.
 */
export async function fetchBnrRates(): Promise<FxRate[]> {
  const res = await fetch(BNR_DAILY_URL, {
    headers: { "User-Agent": "Banii/0.1 (+banii.app)" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`BNR HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseBnrXml(xml);
}

/**
 * Fetch BNR rates for an entire year (`nbrfxrates{year}.xml`).
 * Folosit la backfill istoric (ultimul 1-2 ani).
 */
export async function fetchBnrYear(year: number): Promise<FxRate[]> {
  const res = await fetch(BNR_HISTORICAL_URL(year), {
    headers: { "User-Agent": "Banii/0.1 (+banii.app)" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`BNR HTTP ${res.status} for year ${year}`);
  }
  const xml = await res.text();
  return parseBnrXml(xml);
}

// ---------------------------------------------------------------- Frankfurter

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

/**
 * Fetch ultimele rate Frankfurter cu base specificat. Default base="EUR".
 * Returnează rate ca FxRate cu base=baseCcy, quote=ccy.
 *
 * Folosit ca fallback când BNR e neaccesibil. Convertim implicit la RON
 * (Frankfurter nu publică RON-base pentru toate monedele, dar acceptă
 * cross prin orice base).
 */
export async function fetchFrankfurterRates(
  base: string = "RON",
): Promise<FxRate[]> {
  const symbols = TRACKED_CURRENCIES.filter(
    (c) => c.toUpperCase() !== base.toUpperCase(),
  ).join(",");

  const url = `${FRANKFURTER_BASE_URL}/latest?from=${encodeURIComponent(
    base,
  )}&to=${encodeURIComponent(symbols)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);

  const json = (await res.json()) as FrankfurterResponse;
  const out: FxRate[] = [];

  for (const [currency, rate] of Object.entries(json.rates ?? {})) {
    if (!Number.isFinite(rate) || rate <= 0) continue;
    out.push({
      rate_date: json.date,
      base: json.base.toUpperCase(),
      quote: currency.toUpperCase(),
      rate,
      source: "Frankfurter",
    });
  }

  return out;
}

// ---------------------------------------------------------------- UI helpers

/**
 * Formatare rate pentru UI. 4 zecimale pentru afișarea standard.
 * Folosim ro-RO (virgula ca separator decimal).
 */
export function formatRate(rate: number, fractionDigits = 4): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(rate);
}
