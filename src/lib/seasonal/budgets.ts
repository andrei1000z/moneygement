// Bugete sezoniere românești: Crăciun, Paște, Black Friday, Mărțișor,
// Vacanța de vară. Fiecare are o fereastră tipică de cheltuieli (lună
// + an dinamic).
//
// Folosit la auto-prompt: 1 lună înainte de fereastră, dashboard
// recomandă să creezi un envelope dedicat dacă nu există deja.

import { holidaysFor } from "@/lib/holidays/ro";

export type SeasonalCatalog = {
  id: string;
  display: string;
  /** Returnează ziua de start și end a ferestrei pentru un an dat. */
  windowFor: (year: number) => { start: string; end: string };
  /** Sugestie tipică de buget (RON, minor units). User-ul îl poate edita. */
  suggested_budget_minor: number;
};

function easter(year: number): Date {
  // Reuse din holidays — Computus pentru Paștele ortodox.
  const all = holidaysFor(year);
  const easterRow = all.find((h) => h.name === "Paștele Ortodox");
  return easterRow ? new Date(easterRow.date) : new Date(`${year}-04-15`);
}

function isoUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const SEASONAL: SeasonalCatalog[] = [
  {
    id: "martisor",
    display: "Mărțișor",
    windowFor: (year) => ({
      start: `${year}-02-15`,
      end: `${year}-03-08`,
    }),
    suggested_budget_minor: 15000, // 150 lei
  },
  {
    id: "easter",
    display: "Paște",
    windowFor: (year) => {
      const d = easter(year);
      const start = new Date(d);
      start.setUTCDate(start.getUTCDate() - 14);
      const end = new Date(d);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start: isoUtc(start), end: isoUtc(end) };
    },
    suggested_budget_minor: 60000, // 600 lei
  },
  {
    id: "summer_holiday",
    display: "Vacanța de vară",
    windowFor: (year) => ({
      start: `${year}-06-15`,
      end: `${year}-08-31`,
    }),
    suggested_budget_minor: 250000, // 2500 lei
  },
  {
    id: "black_friday",
    display: "Black Friday",
    windowFor: (year) => ({
      start: `${year}-11-10`,
      end: `${year}-11-30`,
    }),
    suggested_budget_minor: 100000, // 1000 lei
  },
  {
    id: "christmas",
    display: "Crăciun",
    windowFor: (year) => ({
      start: `${year}-12-01`,
      end: `${year}-12-26`,
    }),
    suggested_budget_minor: 150000, // 1500 lei
  },
];

/**
 * Întoarce evenimentele sezoniere care încep în următoarele `daysAhead`
 * zile. Folosit de un job luni dimineață pentru auto-prompt.
 */
export function upcomingSeasonal(
  today: Date = new Date(),
  daysAhead = 31,
): Array<SeasonalCatalog & { window: { start: string; end: string } }> {
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() + daysAhead);
  const todayIso = isoUtc(today);
  const cutoffIso = isoUtc(cutoff);

  const out: Array<SeasonalCatalog & { window: { start: string; end: string } }> =
    [];

  for (const cat of SEASONAL) {
    // Verificăm fereastra pentru anul curent și cel următor.
    const year = today.getUTCFullYear();
    for (const y of [year, year + 1]) {
      const win = cat.windowFor(y);
      if (win.start >= todayIso && win.start <= cutoffIso) {
        out.push({ ...cat, window: win });
      }
    }
  }

  return out.sort((a, b) => a.window.start.localeCompare(b.window.start));
}
