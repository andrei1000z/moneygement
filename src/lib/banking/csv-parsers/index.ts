// Punct de intrare pentru parserii CSV bancari. Expune `detectFormat` care
// alege primul parser care recunoaște header-ul, și `parsers` map pentru
// override manual din UI.

import { bcrGeorge } from "./bcr-george";
import { bt24 } from "./bt24";
import { cec } from "./cec";
import { ing } from "./ing";
import { raiffeisen } from "./raiffeisen";
import { revolut } from "./revolut";

import type { BankFormat, BankParser } from "../types";

export const PARSERS: BankParser[] = [
  bt24,
  bcrGeorge,
  ing,
  revolut,
  cec,
  raiffeisen,
];

export const PARSER_MAP: Record<BankFormat, BankParser> = {
  bt24,
  bcr: bcrGeorge,
  ing,
  revolut,
  cec,
  raiffeisen,
};

export function detectFormat(csv: string): BankFormat | null {
  for (const p of PARSERS) {
    if (p.detect(csv)) return p.id;
  }
  return null;
}

export type { BankFormat, BankParser, ParsedTransaction } from "../types";
