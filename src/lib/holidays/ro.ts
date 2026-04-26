// Calendar zile libere România — fix + mobile (Paște, Rusalii) prin Computus.
//
// Lista oficială (2026): 1-2 ian, 24 ian (Unirea), Paște (Vinerea Mare,
// Duminica și Lunea Paștelui), 1 mai, 1 iunie (Ziua Copilului), Rusalii
// (Duminica și Lunea), 15 august (Adormirea Maicii Domnului), 30 noiembrie
// (Sfântul Andrei), 1 decembrie (Ziua Națională), 25-26 decembrie.

export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  type: "fixed" | "easter" | "pentecost";
};

const FIXED: Array<{ md: string; name: string }> = [
  { md: "01-01", name: "Anul Nou" },
  { md: "01-02", name: "Anul Nou" },
  { md: "01-24", name: "Unirea Principatelor" },
  { md: "05-01", name: "Ziua Muncii" },
  { md: "06-01", name: "Ziua Copilului" },
  { md: "08-15", name: "Adormirea Maicii Domnului" },
  { md: "11-30", name: "Sfântul Andrei" },
  { md: "12-01", name: "Ziua Națională" },
  { md: "12-25", name: "Crăciun" },
  { md: "12-26", name: "Crăciun" },
];

/**
 * Computus pentru Paștele ortodox (Meeus' algorithm pentru calendar
 * iulian, apoi conversie la gregorian).
 *
 * Pașii Bisericii Ortodoxe Române urmează stilul ortodox.
 */
function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const monthJulian = Math.floor((d + e + 114) / 31);
  const dayJulian = ((d + e + 114) % 31) + 1;
  // Iulian → Gregorian: +13 zile pentru sec XX-XXI.
  const julianDate = new Date(Date.UTC(year, monthJulian - 1, dayJulian));
  julianDate.setUTCDate(julianDate.getUTCDate() + 13);
  return julianDate;
}

function isoUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function holidaysFor(year: number): Holiday[] {
  const out: Holiday[] = [];

  for (const f of FIXED) {
    out.push({
      date: `${year}-${f.md}`,
      name: f.name,
      type: "fixed",
    });
  }

  const easter = orthodoxEaster(year);
  out.push(
    {
      date: isoUtc(addDays(easter, -2)),
      name: "Vinerea Mare",
      type: "easter",
    },
    { date: isoUtc(easter), name: "Paștele Ortodox", type: "easter" },
    { date: isoUtc(addDays(easter, 1)), name: "Lunea Paștelui", type: "easter" },
    {
      date: isoUtc(addDays(easter, 49)),
      name: "Rusalii",
      type: "pentecost",
    },
    {
      date: isoUtc(addDays(easter, 50)),
      name: "Lunea Rusaliilor",
      type: "pentecost",
    },
  );

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function isHoliday(date: Date | string): Holiday | null {
  const iso = typeof date === "string" ? date : isoUtc(date);
  const year = Number.parseInt(iso.slice(0, 4), 10);
  if (!Number.isFinite(year)) return null;
  return holidaysFor(year).find((h) => h.date === iso) ?? null;
}

export function nextHoliday(from: Date = new Date()): Holiday | null {
  const iso = isoUtc(from);
  const thisYear = Number.parseInt(iso.slice(0, 4), 10);
  const all = [...holidaysFor(thisYear), ...holidaysFor(thisYear + 1)];
  return all.find((h) => h.date >= iso) ?? null;
}
