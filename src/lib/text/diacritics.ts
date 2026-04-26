// Helpers pentru text românesc — normalizare cu/fără diacritice.
//
// `normalizeRomanian` păstrează diacriticele dar curăță whitespace și
// canonicalizează minuscule.
// `removeDiacritics` le elimină — folosit la search insensitive.

export function normalizeRomanian(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function removeDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Comparare insensitivă de diacritice + caz pentru search/match.
 */
export function looseEquals(a: string, b: string): boolean {
  return removeDiacritics(a).toLowerCase() === removeDiacritics(b).toLowerCase();
}

/**
 * Caută `needle` în `haystack` ignorând diacritice și caz.
 */
export function looseIncludes(haystack: string, needle: string): boolean {
  return removeDiacritics(haystack)
    .toLowerCase()
    .includes(removeDiacritics(needle).toLowerCase());
}
