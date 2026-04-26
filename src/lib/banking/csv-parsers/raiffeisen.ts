// Raiffeisen Smart Mobile — extras CSV.
//
// Convenție observată:
//   - delimiter `;`
//   - headers (RO): "Data tranzactie", "Detalii operatiune",
//     "Suma debit", "Suma credit", "Moneda", "Sold curent"

import type { BankParser, ParsedTransaction } from "../types";
import {
  findColumn,
  hasAnyHeader,
  makeExternalId,
  parseCsv,
  parseDate,
  parseDecimal,
  toMinorUnits,
} from "./_helpers";

export const raiffeisen: BankParser = {
  id: "raiffeisen",
  label: "Raiffeisen Smart Mobile",

  detect(csv) {
    const { headers } = parseCsv(csv);
    if (headers.length === 0) return false;
    return (
      hasAnyHeader(headers, ["data tranzactie", "data tranzacție"]) &&
      hasAnyHeader(headers, ["detalii operatiune", "detalii operațiune"]) &&
      hasAnyHeader(headers, ["suma debit"]) &&
      hasAnyHeader(headers, ["suma credit"])
    );
  },

  parse(csv) {
    const { headers, rows } = parseCsv(csv);
    if (headers.length === 0) return [];

    const ixDate = findColumn(headers, [
      "data tranzactie",
      "data tranzacție",
    ]);
    const ixDetails = findColumn(headers, [
      "detalii operatiune",
      "detalii operațiune",
      "detalii",
    ]);
    const ixDebit = findColumn(headers, ["suma debit"]);
    const ixCredit = findColumn(headers, ["suma credit"]);
    const ixCurrency = findColumn(headers, ["moneda", "valuta"]);

    const out: ParsedTransaction[] = [];
    for (const row of rows) {
      const date = parseDate(row[ixDate] ?? "");
      if (!date) continue;

      const debit = parseDecimal(row[ixDebit] ?? "");
      const credit = parseDecimal(row[ixCredit] ?? "");
      let value = 0;
      if (credit && credit > 0) value = credit;
      else if (debit && debit > 0) value = -debit;
      else continue;

      const currency =
        (row[ixCurrency] ?? "RON").toUpperCase().trim() || "RON";
      const notes = (row[ixDetails] ?? "").trim();
      const amount = toMinorUnits(value, currency);

      out.push({
        date,
        amount,
        currency,
        notes,
        external_id: makeExternalId("raiffeisen", date, amount, notes),
      });
    }
    return out;
  },
};
