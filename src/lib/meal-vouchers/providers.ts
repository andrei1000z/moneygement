// Tichete masă — providers RO (Edenred, Pluxee/Sodexo, Up România).
//
// Detect provider dintr-un text de tranzacție (payee + notes) ca să creăm
// auto un cont de tip 'meal_voucher' la prima detecție.

export type MealVoucherProvider = "edenred" | "pluxee" | "up_romania";

export type ProviderMeta = {
  id: MealVoucherProvider;
  display: string;
  /** Sigla — atașăm la account.bank_name pentru afișare. */
  bank_label: string;
  /** Patterns regex pentru match. */
  patterns: RegExp[];
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "edenred",
    display: "Edenred",
    bank_label: "Edenred",
    patterns: [/\bedenred\b/i],
  },
  {
    id: "pluxee",
    display: "Pluxee (Sodexo)",
    bank_label: "Pluxee",
    patterns: [/\bpluxee\b/i, /\bsodexo\b/i],
  },
  {
    id: "up_romania",
    display: "Up România",
    bank_label: "Up România",
    patterns: [/\bup\s?romania\b/i, /\bup\s?ro\b/i, /\buromaniachq\b/i],
  },
];

/**
 * Match un text la un provider de tichete. Returnează null dacă nu match-uie.
 */
export function detectProvider(text: string): MealVoucherProvider | null {
  for (const p of PROVIDERS) {
    if (p.patterns.some((r) => r.test(text))) return p.id;
  }
  return null;
}

/**
 * Tichetele masă au un termen de 12 luni de la creditare. Această funcție
 * întoarce câte luni mai sunt până la expirare pentru un lot creditat la
 * o anumită dată.
 */
export function expiryStatus(creditedOn: string, today: Date = new Date()):
  | { expired: true; days_overdue: number }
  | { expired: false; days_remaining: number; warn: boolean } {
  const credited = Date.parse(creditedOn);
  if (!Number.isFinite(credited)) {
    return { expired: false, days_remaining: 365, warn: false };
  }
  const expires = credited + 365 * 86400000;
  const remaining = Math.ceil((expires - today.getTime()) / 86400000);
  if (remaining < 0) {
    return { expired: true, days_overdue: -remaining };
  }
  return {
    expired: false,
    days_remaining: remaining,
    warn: remaining < 60,
  };
}
