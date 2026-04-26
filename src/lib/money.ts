import { dinero, toDecimal, type Currency, type Dinero } from "dinero.js";

// =====================================================================
// Money helpers — Dinero.js v2 + Intl.NumberFormat (ro-RO).
//
//   - amounts circle through the app as `bigint` minor units (BIGINT in
//     Postgres). NEVER use float for money.
//   - formatMoney post-procesează "RON" -> "lei" pentru că Intl nu cunoaște
//     simbolul informal românesc.
// =====================================================================

export type CurrencyCode = "RON" | "EUR" | "USD" | "GBP" | "CHF" | "HUF";

export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = [
  "RON",
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "HUF",
] as const;

const CURRENCIES: Record<CurrencyCode, Currency<number>> = {
  RON: { code: "RON", base: 10, exponent: 2 },
  EUR: { code: "EUR", base: 10, exponent: 2 },
  USD: { code: "USD", base: 10, exponent: 2 },
  GBP: { code: "GBP", base: 10, exponent: 2 },
  CHF: { code: "CHF", base: 10, exponent: 2 },
  HUF: { code: "HUF", base: 10, exponent: 2 },
};

function currencyOf(code: string): Currency<number> {
  const c = CURRENCIES[code as CurrencyCode];
  if (!c) {
    throw new Error(`Unsupported currency: ${code}`);
  }
  return c;
}

function factorFor(code: string): number {
  const c = currencyOf(code);
  // Dinero.js v2 permite `base` să fie array (sub-unități neuniforme — ex.
  // unele monede istorice). Toate valutele V1 au base=10 simplu.
  const base = Array.isArray(c.base) ? (c.base[0] ?? 10) : c.base;
  return base ** c.exponent;
}

/**
 * 12.34 → 1234n (RON, exponent 2). Rotunjește la unitate minoră cea mai
 * apropiată (half-away-from-zero) ca să eviți floats acumulate.
 */
export function toMinor(amount: number, currency: string): bigint {
  if (!Number.isFinite(amount)) {
    throw new Error(`toMinor: amount is not finite (${amount})`);
  }
  const factor = factorFor(currency);
  // Math.round face half-away-from-zero pentru pozitivi, half-towards-zero
  // pentru negativi. Pentru consistență monetară folosim banker-style:
  // simulăm half-away-from-zero pe ambele semne.
  const scaled = amount * factor;
  const rounded = scaled >= 0 ? Math.round(scaled) : -Math.round(-scaled);
  return BigInt(rounded);
}

/**
 * 1234n → 12.34 (RON). Acceptă bigint sau number (când Supabase returnează
 * bigint columns ca number într-un context fără bigint loss).
 */
export function fromMinor(minor: bigint | number, currency: string): number {
  const factor = factorFor(currency);
  if (typeof minor === "bigint") {
    // bigint -> number cu pierdere de precizie acceptată pentru afișare
    // (bigint nu suportă diviziune zecimală, deci convertim controlat).
    const wholePart = Number(minor / BigInt(factor));
    const remainder = Number(minor % BigInt(factor));
    return wholePart + remainder / factor;
  }
  return minor / factor;
}

/**
 * Construiește un Dinero v2 dintr-o sumă în unități minore.
 */
export function makeMoney(minor: bigint | number, currency: string): Dinero<number> {
  const amountNum =
    typeof minor === "bigint"
      ? // Aprox: bigint -> number e safe până la 2^53 (≈ 90 quadrilions de bani).
        Number(minor)
      : minor;
  const c = currencyOf(currency);
  return dinero({ amount: Math.trunc(amountNum), currency: c });
}

/**
 * "12,34 lei" / "−1.234,56 lei" / "12,00 €". Pentru RON înlocuim sufixul
 * "RON" cu "lei" pe care îl preferă utilizatorii români.
 */
export function formatMoney(
  minor: bigint | number,
  currency: string,
  locale: string = "ro-RO",
): string {
  const value = fromMinor(minor, currency);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let formatted = formatter.format(value);
  if (currency === "RON") {
    formatted = formatted
      .replace(/\bRON\b/i, "lei")
      .replace(/\bLEI\b/, "lei");
  }
  // Minus la stânga semnului monedei: forțăm minusul ca prefix unic, pentru
  // că Intl plasează "−" diferit între locales.
  return formatted.replace(/^-/, "−");
}

/**
 * Descompune un format "ro-RO" în părți pentru a randa zecimalele la 80%
 * size, cu semnele/simbolurile separate.
 *
 *   formatMoneyParts(123450n, 'RON')
 *   → { sign: '', integer: '1.234', decimal: '50', symbol: 'lei',
 *       separator: ',', currency: 'RON' }
 */
export function formatMoneyParts(
  minor: bigint | number,
  currency: string,
  locale: string = "ro-RO",
) {
  const value = fromMinor(minor, currency);
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(value);

  let sign = "";
  let integer = "";
  let decimal = "";
  let separator = ",";
  let symbol = "";

  for (const p of parts) {
    switch (p.type) {
      case "minusSign":
        sign = "−";
        break;
      case "plusSign":
        sign = "+";
        break;
      case "integer":
      case "group":
        integer += p.value;
        break;
      case "decimal":
        separator = p.value;
        break;
      case "fraction":
        decimal += p.value;
        break;
      case "currency":
        symbol = currency === "RON" ? "lei" : p.value;
        break;
      // ignore: literal (de obicei spațiu între număr și simbol)
    }
  }

  return {
    sign,
    integer,
    decimal,
    separator,
    symbol,
    currency,
  } as const;
}

/**
 * Verifică dacă suma e zero (în orice monedă).
 */
export function isZero(minor: bigint | number): boolean {
  return typeof minor === "bigint" ? minor === 0n : minor === 0;
}

/**
 * Verifică dacă suma e negativă.
 */
export function isNegative(minor: bigint | number): boolean {
  return typeof minor === "bigint" ? minor < 0n : minor < 0;
}

export { toDecimal };
