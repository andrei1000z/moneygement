// Merchant matcher românesc — 4 tier-uri:
//   1. Brand keyword direct (LIDL, KAUFLAND, EMAG, ...)
//   2. Legal entity → brand canonical (DANTE INTERNATIONAL → eMAG)
//   3. MCC code fallback (5411 → groceries, 5814 → restaurant fast food, ...)
//   4. Free-text fallback — întoarce primele 32 caractere normalizate
//
// Folosit la importul CSV pentru a popula `payee` cu denumirea canonică
// înainte ca tier-ul de categorisare AI/rules să își facă treaba.

export type MerchantMatch = {
  payee: string;
  category_hint?: string;
  confidence: "high" | "medium" | "low";
  source: "brand" | "legal_entity" | "mcc" | "freetext";
};

// ---------- Tier 1: brand keyword ---------------------------------------
// Cheia e regex-ul, valoarea e numele canonical + (opțional) hint categorie.
const BRAND_RULES: Array<{
  pattern: RegExp;
  payee: string;
  category?: string;
}> = [
  // Supermarket / hipermarket
  { pattern: /\blidl\b/i, payee: "Lidl", category: "Cumpărături" },
  { pattern: /\bkaufland\b/i, payee: "Kaufland", category: "Cumpărături" },
  { pattern: /\bcarrefour\b/i, payee: "Carrefour", category: "Cumpărături" },
  { pattern: /\bauchan\b/i, payee: "Auchan", category: "Cumpărături" },
  { pattern: /\bmega ?image\b/i, payee: "Mega Image", category: "Cumpărături" },
  { pattern: /\bprofi\b/i, payee: "Profi", category: "Cumpărături" },
  { pattern: /\bpenny\b/i, payee: "Penny", category: "Cumpărături" },
  { pattern: /\bselgros\b/i, payee: "Selgros", category: "Cumpărături" },
  { pattern: /\bmetro\b/i, payee: "Metro", category: "Cumpărături" },

  // E-commerce
  { pattern: /\bemag\b|\be\s?mag\b/i, payee: "eMAG", category: "Cumpărături" },
  { pattern: /\baltex\b/i, payee: "Altex", category: "Cumpărături" },
  { pattern: /\bflanco\b/i, payee: "Flanco", category: "Cumpărături" },
  { pattern: /\bdedeman\b/i, payee: "Dedeman", category: "Casă" },
  { pattern: /\bbricostore\b/i, payee: "Bricostore", category: "Casă" },
  { pattern: /\bhornbach\b/i, payee: "Hornbach", category: "Casă" },
  { pattern: /\bikea\b/i, payee: "IKEA", category: "Casă" },

  // Food delivery / restaurant
  { pattern: /\bglovo\b/i, payee: "Glovo", category: "Restaurante" },
  { pattern: /\btazz\b/i, payee: "Tazz", category: "Restaurante" },
  { pattern: /\bbolt food\b/i, payee: "Bolt Food", category: "Restaurante" },
  { pattern: /\bfoodpanda\b/i, payee: "foodpanda", category: "Restaurante" },
  { pattern: /\bmcdonald'?s\b/i, payee: "McDonald's", category: "Restaurante" },
  { pattern: /\bkfc\b/i, payee: "KFC", category: "Restaurante" },
  { pattern: /\bstarbucks\b/i, payee: "Starbucks", category: "Restaurante" },
  { pattern: /\bsubway\b/i, payee: "Subway", category: "Restaurante" },

  // Transport
  { pattern: /\bbolt\b(?! food)/i, payee: "Bolt", category: "Transport" },
  { pattern: /\buber\b/i, payee: "Uber", category: "Transport" },
  { pattern: /\bfreenow\b|\bfree now\b/i, payee: "FREE NOW", category: "Transport" },
  { pattern: /\bstb\b|\brati\b/i, payee: "STB / RATB", category: "Transport" },
  { pattern: /\bcfr\b/i, payee: "CFR Călători", category: "Transport" },
  { pattern: /\b(omv|petrom|rompetrol|mol|lukoil)\b/i, payee: "Combustibil", category: "Transport" },

  // Telecom / utilități
  { pattern: /\bdigi\b/i, payee: "Digi", category: "Utilități" },
  { pattern: /\borange\b/i, payee: "Orange", category: "Utilități" },
  { pattern: /\bvodafone\b/i, payee: "Vodafone", category: "Utilități" },
  { pattern: /\btelekom\b/i, payee: "Telekom", category: "Utilități" },
  { pattern: /\benel\b|\benergo\b|\belectrica\b/i, payee: "Electrica", category: "Utilități" },
  { pattern: /\bdistrigaz\b|\bengie\b/i, payee: "Engie / Distrigaz", category: "Utilități" },
  { pattern: /\bapa\s?nova\b/i, payee: "Apa Nova", category: "Utilități" },

  // Streaming / abonamente
  { pattern: /\bnetflix\b/i, payee: "Netflix", category: "Abonamente" },
  { pattern: /\bspotify\b/i, payee: "Spotify", category: "Abonamente" },
  { pattern: /\byoutube\s?premium\b/i, payee: "YouTube Premium", category: "Abonamente" },
  { pattern: /\bhbo\b|\bmax\b/i, payee: "HBO Max", category: "Abonamente" },
  { pattern: /\bdisney\+\b/i, payee: "Disney+", category: "Abonamente" },
  { pattern: /\bapple\.com\b|\bapple\s+(itunes|services)\b/i, payee: "Apple", category: "Abonamente" },
  { pattern: /\bgoogle\s?(play|cloud|one)\b/i, payee: "Google", category: "Abonamente" },
  { pattern: /\bicloud\b/i, payee: "iCloud", category: "Abonamente" },

  // ATM / fee bancar
  { pattern: /\batm\b|\bretragere numerar\b/i, payee: "ATM", category: "Numerar" },
  { pattern: /\bcomision\b/i, payee: "Comision bancar", category: "Comisioane" },

  // Tichete masă
  { pattern: /\bedenred\b/i, payee: "Edenred", category: "Tichete masă" },
  { pattern: /\bpluxee\b|\bsodexo\b/i, payee: "Pluxee (Sodexo)", category: "Tichete masă" },
  { pattern: /\bup\s?romania\b/i, payee: "Up România", category: "Tichete masă" },
];

// ---------- Tier 2: legal entity → brand canonical ----------------------
const LEGAL_ENTITIES: Array<{ pattern: RegExp; payee: string; category?: string }> = [
  { pattern: /dante\s+international/i, payee: "eMAG", category: "Cumpărături" },
  { pattern: /carrefour\s+rom/i, payee: "Carrefour", category: "Cumpărături" },
  { pattern: /lidl\s+discount/i, payee: "Lidl", category: "Cumpărături" },
  { pattern: /metro\s+cash/i, payee: "Metro", category: "Cumpărături" },
  { pattern: /telekom\s+romania/i, payee: "Telekom", category: "Utilități" },
  { pattern: /rcs[\s&-]?rds|digi\s+rom/i, payee: "Digi", category: "Utilități" },
  { pattern: /e[\.-]?on\s+energie|delgaz\s+grid/i, payee: "E.ON / Delgaz", category: "Utilități" },
];

// ---------- Tier 3: MCC fallback ---------------------------------------
const MCC_TO_CATEGORY: Record<string, { payee: string; category: string }> = {
  "5411": { payee: "Magazin alimentar", category: "Cumpărături" },
  "5499": { payee: "Magazin diverse", category: "Cumpărături" },
  "5541": { payee: "Combustibil", category: "Transport" },
  "5812": { payee: "Restaurant", category: "Restaurante" },
  "5813": { payee: "Bar / club", category: "Distracție" },
  "5814": { payee: "Fast food", category: "Restaurante" },
  "5912": { payee: "Farmacie", category: "Sănătate" },
  "4111": { payee: "Transport public", category: "Transport" },
  "4121": { payee: "Taxi", category: "Transport" },
  "4131": { payee: "Bus interurban", category: "Transport" },
  "4900": { payee: "Utilități", category: "Utilități" },
  "6011": { payee: "ATM", category: "Numerar" },
  "7372": { payee: "Servicii software", category: "Abonamente" },
  "7832": { payee: "Cinema", category: "Distracție" },
  "8062": { payee: "Spital", category: "Sănătate" },
};

// ---------- Public API --------------------------------------------------

/**
 * Extrage codul MCC dintr-o descriere brută, dacă apare.
 * BNR și majoritatea băncilor românești ataşează MCC între paranteze
 * sau după keyword-ul `MCC:`.
 */
function extractMcc(text: string): string | null {
  const m = text.match(/\bMCC[:\s]*(\d{4})\b/i) ?? text.match(/\b(\d{4})\b/);
  return m ? (m[1] ?? null) : null;
}

/**
 * Match unei tranzacții la merchant. Folosește textul brut (notes / payee
 * din parser).
 */
export function matchMerchant(
  rawText: string,
  hintMcc?: string | null,
): MerchantMatch {
  const text = rawText ?? "";

  // Tier 1: brand keyword
  for (const r of BRAND_RULES) {
    if (r.pattern.test(text)) {
      return {
        payee: r.payee,
        category_hint: r.category,
        confidence: "high",
        source: "brand",
      };
    }
  }

  // Tier 2: legal entity
  for (const r of LEGAL_ENTITIES) {
    if (r.pattern.test(text)) {
      return {
        payee: r.payee,
        category_hint: r.category,
        confidence: "high",
        source: "legal_entity",
      };
    }
  }

  // Tier 3: MCC
  const mcc = hintMcc ?? extractMcc(text);
  if (mcc && MCC_TO_CATEGORY[mcc]) {
    const v = MCC_TO_CATEGORY[mcc]!;
    return {
      payee: v.payee,
      category_hint: v.category,
      confidence: "medium",
      source: "mcc",
    };
  }

  // Tier 4: free-text — păstrăm primul cuvânt non-numeric semnificativ.
  const cleaned = text
    .replace(/\b(POS|ROL|RON|EUR|USD|XXXX|\*+|REF\d+)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2 && /[A-Za-zĂÂÎȘȚăâîșț]/.test(w));
  const payee =
    words.slice(0, 3).join(" ").slice(0, 32) || "Tranzacție";

  return {
    payee,
    confidence: "low",
    source: "freetext",
  };
}
